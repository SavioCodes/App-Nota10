import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { toDbArtifacts, parseArtifactBundle, validateArtifactBundleSources } from "./_core/artifacts";
import { chunkTextDeterministic, computeTextHash, normalizeExtractedText } from "./_core/chunker";
import { getSessionCookieOptions } from "./_core/cookies";
import { assertUploadSize, extractDocumentText } from "./_core/extraction";
import { invokeLLM, type StudyMode } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

type ArtifactMode = "faithful" | "deepened" | "exam";
type ChunkData = { id: number; text: string };

function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

async function assertConversionAllowed(userId: number) {
  const plan = await db.getEffectivePlan(userId);
  if (plan !== "free") return plan;

  const usage = await db.getDailyUsage(userId, getTodayIsoDate());
  if (usage.conversionCount >= 3) {
    throw new Error("LIMIT_REACHED");
  }
  return plan;
}

async function consumeConversionIfNeeded(userId: number, plan: Awaited<ReturnType<typeof db.getEffectivePlan>>) {
  if (plan !== "free") return;
  await db.incrementDailyUsage(userId, getTodayIsoDate());
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && "type" in part && (part as any).type === "text") {
        return (part as any).text ?? "";
      }
      return "";
    })
    .join("");
}

function safeJsonParse(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(withoutFence);
  }
}

function modeInstruction(mode: ArtifactMode): string {
  if (mode === "faithful") {
    return [
      "Use apenas o material dos chunks.",
      "Cada item deve ter sourceChunkIds validos.",
      "Quando nao houver suporte no material, use notFoundInMaterial=true e sourceChunkIds=[].",
      "Nao invente fatos.",
    ].join("\n");
  }

  if (mode === "exam") {
    return [
      "Use apenas o material dos chunks, com foco em cobranca estilo prova.",
      "Cada item deve ter sourceChunkIds validos.",
      "Para questoes de multipla escolha, inclua 4 opcoes plausiveis.",
      "Quando faltar base no material, use notFoundInMaterial=true e sourceChunkIds=[].",
    ].join("\n");
  }

  return [
    "Separe explicitamente itens FIEL vs COMPLEMENTO usando section: 'FIEL'|'COMPLEMENTO'.",
    "Itens FIEL devem conter sourceChunkIds validos.",
    "Itens COMPLEMENTO podem ter sourceChunkIds vazio.",
    "Nao misture afirmacoes complementares em itens marcados como FIEL.",
  ].join("\n");
}

function buildChunkMaterial(chunks: ChunkData[]): string {
  return chunks.map((chunk) => `[CHUNK_${chunk.id}]\n${chunk.text}`).join("\n\n");
}

async function generateArtifactsDraftWithFlash(
  mode: ArtifactMode,
  chunks: ChunkData[],
): Promise<ReturnType<typeof parseArtifactBundle>> {
  const prompt = `
MODO: ${mode}

INSTRUCOES:
${modeInstruction(mode)}

MATERIAL:
${buildChunkMaterial(chunks)}

Retorne APENAS JSON valido com este formato:
{
  "summary": [
    { "text": "string", "sourceChunkIds": [1], "section": "FIEL|COMPLEMENTO", "isComplement": false, "notFoundInMaterial": false }
  ],
  "map": {
    "title": "string",
    "topics": [
      { "title": "string", "subtopics": ["string"], "sourceChunkIds": [1], "section": "FIEL|COMPLEMENTO", "isComplement": false }
    ]
  },
  "flashcards": [
    { "front": "string", "back": "string", "difficultyTag": "definition|cause_effect|comparison|example|trick", "sourceChunkIds": [1], "section": "FIEL|COMPLEMENTO", "isComplement": false, "notFoundInMaterial": false }
  ],
  "questions": [
    { "type": "multiple_choice|open", "prompt": "string", "options": ["A","B","C","D"], "answerKey": "string", "rationaleShort": "string", "sourceChunkIds": [1], "section": "FIEL|COMPLEMENTO", "isComplement": false, "notFoundInMaterial": false }
  ]
}

Quantidade minima:
- 5 itens em summary
- 3 topicos em map
- 10 flashcards
- 10 questions
`;

  const result = await invokeLLM({
    profile: "fast",
    mode,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Voce e um especialista educacional brasileiro. Sempre responda em portugues brasileiro e apenas com JSON valido.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw = extractTextContent(result.choices[0]?.message?.content);
  return parseArtifactBundle(safeJsonParse(raw));
}

async function validateArtifactsWithPro(
  mode: ArtifactMode,
  chunks: ChunkData[],
  draft: ReturnType<typeof parseArtifactBundle>,
): Promise<ReturnType<typeof parseArtifactBundle>> {
  const prompt = `
Valide e corrija os artefatos com base no material.

REGRAS:
- Todos os sourceChunkIds devem existir.
- Itens com section=FIEL devem ser sustentados apenas pelos chunks citados.
- Se nao houver evidencia no material, marque notFoundInMaterial=true e sourceChunkIds=[].
- Em modo deepened, section=COMPLEMENTO pode ter sourceChunkIds=[].
- Preserve estrutura e idioma em portugues brasileiro.

MODO: ${mode}

MATERIAL:
${buildChunkMaterial(chunks)}

ARTEFATOS_RASCUNHO:
${JSON.stringify(draft)}

Retorne APENAS JSON valido no mesmo formato de entrada.
`;

  const result = await invokeLLM({
    profile: "strict",
    mode,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Voce e um verificador rigoroso de fidelidade factual. Responda apenas JSON valido.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const raw = extractTextContent(result.choices[0]?.message?.content);
  return parseArtifactBundle(safeJsonParse(raw));
}

async function generateArtifactsForDocument(args: {
  documentId: number;
  mode: ArtifactMode;
  userId: number;
  consumeUsage: boolean;
}) {
  const document = await db.getDocument(args.documentId);
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");

  const chunkRows = await db.getDocumentChunks(args.documentId);
  if (chunkRows.length === 0) throw new Error("Documento sem texto extraido");

  const chunks: ChunkData[] = chunkRows.map((chunk) => ({ id: chunk.id, text: chunk.textContent }));
  const sourceHash = document.textHash ?? computeTextHash(chunks.map((chunk) => chunk.text).join("\n\n"));

  const cached = await db.getDocumentArtifacts(args.documentId, undefined, args.mode, sourceHash);
  if (cached.length > 0) {
    return { cached: true, count: cached.length };
  }

  const plan = args.consumeUsage ? await assertConversionAllowed(args.userId) : await db.getEffectivePlan(args.userId);

  const draftBundle = await generateArtifactsDraftWithFlash(args.mode, chunks);

  let validatedBundle = draftBundle;
  try {
    validatedBundle = await validateArtifactsWithPro(args.mode, chunks, draftBundle);
  } catch (error) {
    console.warn("[Artifacts] strict validation fallback:", error);
  }

  const validChunkIds = new Set(chunkRows.map((chunk) => chunk.id));
  const sourceValidated = validateArtifactBundleSources(validatedBundle, validChunkIds, args.mode);
  const rows = toDbArtifacts(sourceValidated, {
    documentId: args.documentId,
    mode: args.mode,
    sourceHash,
  });

  if (rows.length === 0) {
    throw new Error("ARTIFACTS_EMPTY");
  }

  await db.createArtifacts(rows);
  if (args.consumeUsage) {
    await consumeConversionIfNeeded(args.userId, plan);
  }

  return { cached: false, count: rows.length };
}

async function processDocument(
  docId: number,
  mimeType: string,
  fileBase64: string,
  userId: number,
) {
  try {
    const fileBuffer = Buffer.from(fileBase64, "base64");
    const extraction = await extractDocumentText({
      fileBuffer,
      fileBase64,
      mimeType,
    });

    const extractedText = normalizeExtractedText(extraction.text);
    if (!extractedText) {
      throw new Error("EMPTY_EXTRACTION");
    }

    const textHash = computeTextHash(extractedText);
    const currentDocument = await db.getDocument(docId);
    const existingChunks = await db.getDocumentChunks(docId);
    const shouldReuseChunks =
      currentDocument?.textHash === textHash && existingChunks.length > 0;

    await db.updateDocumentStatus(
      docId,
      "generating",
      extractedText,
      extraction.confidence,
      textHash,
    );

    if (!shouldReuseChunks) {
      const deterministicChunks = chunkTextDeterministic(extractedText);
      await db.deleteDocumentChunks(docId);
      await db.createChunks(
        docId,
        deterministicChunks.map((chunk) => ({
          chunkOrder: chunk.chunkOrder,
          textContent: chunk.textContent,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        })),
      );
    }

    await generateArtifactsForDocument({
      documentId: docId,
      mode: "faithful",
      userId,
      consumeUsage: true,
    });

    await db.updateDocumentStatus(docId, "ready");
  } catch (error) {
    console.error("[Process] Document processing failed:", error);
    await db.updateDocumentStatus(docId, "error");
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  folders: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserFolders(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(({ ctx, input }) => db.createFolder({ userId: ctx.user.id, name: input.name })),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteFolder(input.id, ctx.user.id)),
  }),

  documents: router({
    list: protectedProcedure
      .input(z.object({ folderId: z.number().optional() }).optional())
      .query(({ ctx, input }) => {
        if (input?.folderId) return db.getFolderDocuments(input.folderId);
        return db.getUserDocuments(ctx.user.id);
      }),
    recent: protectedProcedure.query(({ ctx }) => db.getUserDocuments(ctx.user.id, 5)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDocument(input.id)),
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
        await assertConversionAllowed(ctx.user.id);

        const fileBuffer = Buffer.from(input.fileBase64, "base64");
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
  }),

  chunks: router({
    list: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(({ input }) => db.getDocumentChunks(input.documentId)),
  }),

  artifacts: router({
    list: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          type: z.enum(["summary", "content_map", "flashcard", "question"]).optional(),
          mode: z.enum(["faithful", "deepened", "exam"]).optional(),
        }),
      )
      .query(async ({ input }) => {
        const document = await db.getDocument(input.documentId);
        return db.getDocumentArtifacts(
          input.documentId,
          input.type,
          input.mode,
          document?.textHash ?? undefined,
        );
      }),
    generate: protectedProcedure
      .input(z.object({ documentId: z.number(), mode: z.enum(["faithful", "deepened", "exam"]) }))
      .mutation(({ ctx, input }) =>
        generateArtifactsForDocument({
          documentId: input.documentId,
          mode: input.mode as StudyMode,
          userId: ctx.user.id,
          consumeUsage: true,
        }),
      ),
  }),

  review: router({
    today: protectedProcedure.query(({ ctx }) => db.getUserReviewItems(ctx.user.id)),
    all: protectedProcedure.query(({ ctx }) => db.getAllUserReviewItems(ctx.user.id)),
    answer: protectedProcedure
      .input(z.object({ reviewItemId: z.number(), quality: z.number().min(0).max(5) }))
      .mutation(async ({ input }) => {
        const { reviewItemId, quality } = input;
        let easeFactor = 2.5;
        let interval = 1;
        let streak = 0;

        if (quality >= 3) {
          streak += 1;
          if (streak === 1) interval = 1;
          else if (streak === 2) interval = 6;
          else interval = Math.round(interval * easeFactor);
          easeFactor = Math.max(
            1.3,
            easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
          );
        } else {
          streak = 0;
          interval = 1;
        }

        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + interval);
        await db.updateReviewItem(reviewItemId, { nextReviewAt, easeFactor, interval, streak });
        return { nextReviewAt, interval, streak };
      }),
    initForDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const document = await db.getDocument(input.documentId);
        const flashcards = await db.getDocumentArtifacts(
          input.documentId,
          "flashcard",
          undefined,
          document?.textHash ?? undefined,
        );
        const now = new Date();
        const items = flashcards.map((artifact) => ({
          userId: ctx.user.id,
          artifactId: artifact.id,
          documentId: input.documentId,
          nextReviewAt: now,
        }));
        await db.createReviewItems(items);
        return { count: items.length };
      }),
  }),

  usage: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      const usage = await db.getDailyUsage(ctx.user.id, getTodayIsoDate());
      const plan = await db.getEffectivePlan(ctx.user.id);
      return {
        conversionsUsed: usage.conversionCount,
        conversionsLimit: plan === "free" ? 3 : -1,
        plan,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
