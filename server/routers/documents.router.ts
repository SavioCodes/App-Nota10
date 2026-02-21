import { z } from "zod";
import { ENV } from "../_core/env";
import { assertUploadMimeType, assertUploadSize } from "../_core/extraction";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { processDocument } from "../services/artifact-generation.service";
import { assertConversionAllowed, assertUserRateLimit } from "../services/usage-limits.service";
import { storagePut } from "../storage";

export const documentsRouter = router({
  list: protectedProcedure
    .input(z.object({ folderId: z.number().optional() }).optional())
    .query(({ ctx, input }) => {
      if (input?.folderId) return db.getFolderDocuments(input.folderId, ctx.user.id);
      return db.getUserDocuments(ctx.user.id);
    }),
  recent: protectedProcedure.query(({ ctx }) => db.getUserDocuments(ctx.user.id, 5)),
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => db.getDocument(input.id, ctx.user.id)),
  upload: protectedProcedure
    .input(
      z.object({
        folderId: z.number(),
        title: z.string().min(1).max(255),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await db.getFolder(input.folderId, ctx.user.id);
      if (!folder) {
        throw new Error("FOLDER_NOT_FOUND");
      }

      assertUserRateLimit({
        scope: "upload",
        userId: ctx.user.id,
        configuredLimit: ENV.rateLimitUploadMax,
        configuredWindowMs: ENV.rateLimitUploadWindowMs,
      });

      await assertConversionAllowed(ctx.user.id);

      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      assertUploadMimeType(input.mimeType);
      assertUploadSize(fileBuffer);

      const fileKey = `docs/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
      const docId = await db.createDocument({
        folderId: input.folderId,
        userId: ctx.user.id,
        title: input.title,
        originalFileUrl: url,
        status: "extracting",
      });

      processDocument(docId, input.mimeType, input.fileBase64, ctx.user.id).catch((error) => {
        console.error("[Process] Error:", error);
        db.updateDocumentStatus(docId, "error");
      });

      return { id: docId, status: "extracting" };
    }),
});
