import { z } from "zod";
import { ENV } from "../_core/env";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { generateArtifactsForDocument } from "../services/artifact-generation.service";
import { assertUserRateLimit } from "../services/usage-limits.service";

export const artifactsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        type: z.enum(["summary", "content_map", "flashcard", "question"]).optional(),
        mode: z.enum(["faithful", "deepened", "exam"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const document = await db.getDocument(input.documentId, ctx.user.id);
      if (!document) return [];
      return db.getDocumentArtifacts(
        input.documentId,
        input.type,
        input.mode,
        document?.textHash ?? undefined,
        ctx.user.id,
      );
    }),
  generate: protectedProcedure
    .input(z.object({ documentId: z.number(), mode: z.enum(["faithful", "deepened", "exam"]) }))
    .mutation(({ ctx, input }) => {
      assertUserRateLimit({
        scope: "artifacts_generate",
        userId: ctx.user.id,
        configuredLimit: ENV.rateLimitArtifactsMax,
        configuredWindowMs: ENV.rateLimitArtifactsWindowMs,
      });

      return generateArtifactsForDocument({
        documentId: input.documentId,
        mode: input.mode,
        userId: ctx.user.id,
        consumeUsage: true,
      });
    }),
});
