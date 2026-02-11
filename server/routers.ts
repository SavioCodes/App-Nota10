import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

// Helper: split text into chunks
function splitTextIntoChunks(text: string, maxChunkSize = 500): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

// Helper: generate artifacts via LLM
async function generateArtifacts(documentId: number, chunkData: Array<{ id: number; text: string }>, mode: "faithful" | "deepened" | "exam") {
  const chunksText = chunkData.map(c => `[CHUNK_${c.id}]: ${c.text}`).join("\n\n");
  const modeInstruction = mode === "faithful"
    ? "Gere APENAS com base no material fornecido. Cada item DEVE ter sourceChunkIds apontando para os chunks usados. Se n\u00e3o encontrar fonte, marque como 'n\u00e3o encontrado no material'."
    : mode === "deepened"
    ? "Gere com base no material, mas pode complementar com conhecimento adicional. Itens do material devem ter sourceChunkIds. Complementos devem ser marcados com isComplement: true."
    : "Foque em quest\u00f5es de prova e pegadinhas. Cada quest\u00e3o DEVE ter sourceChunkIds. Gere quest\u00f5es de m\u00faltipla escolha e dissertativas.";

  const prompt = `Voc\u00ea \u00e9 um assistente educacional. Analise o seguinte material e gere conte\u00fado de estudo.

MATERIAL:
${chunksText}

INSTRU\u00c7\u00d5ES:
${modeInstruction}

Retorne um JSON com a seguinte estrutura:
{
  "summary": [{ "text": "ponto do resumo", "sourceChunkIds": [1, 2] }],
  "contentMap": { "title": "T\u00edtulo", "topics": [{ "title": "T\u00f3pico", "subtopics": ["Sub1"], "sourceChunkIds": [1] }] },
  "flashcards": [{ "front": "pergunta", "back": "resposta", "level": "definition", "sourceChunkIds": [1] }],
  "questions": [{ "question": "pergunta", "options": ["a)", "b)", "c)", "d)"], "correctAnswer": "a)", "justification": "explica\u00e7\u00e3o", "sourceChunkIds": [1] }]
}

Gere pelo menos: 5 pontos de resumo, 3 t\u00f3picos no mapa, 10 flashcards (variando os n\u00edveis: definition, cause_effect, comparison, example, trick), 10 quest\u00f5es.
Retorne APENAS o JSON v\u00e1lido.`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: "Voc\u00ea \u00e9 um assistente educacional brasileiro. Sempre responda em portugu\u00eas brasileiro. Retorne apenas JSON v\u00e1lido." },
      { role: "user", content: prompt },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = result.choices[0]?.message?.content;
  const textContent = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: any) => c.type === "text" ? c.text : "").join("") : "";

  const parsed = JSON.parse(textContent);
  const allArtifacts: Array<{ documentId: number; type: "summary" | "content_map" | "flashcard" | "question"; content: any; sourceChunkIds: number[]; mode: "faithful" | "deepened" | "exam" }> = [];

  if (parsed.summary) {
    for (const item of parsed.summary) {
      allArtifacts.push({ documentId, type: "summary", content: { text: item.text, isComplement: item.isComplement || false }, sourceChunkIds: item.sourceChunkIds || [], mode });
    }
  }
  if (parsed.contentMap) {
    allArtifacts.push({ documentId, type: "content_map", content: parsed.contentMap, sourceChunkIds: parsed.contentMap.topics?.flatMap((t: any) => t.sourceChunkIds || []) || [], mode });
  }
  if (parsed.flashcards) {
    for (const card of parsed.flashcards) {
      allArtifacts.push({ documentId, type: "flashcard", content: { front: card.front, back: card.back, level: card.level || "definition", isComplement: card.isComplement || false }, sourceChunkIds: card.sourceChunkIds || [], mode });
    }
  }
  if (parsed.questions) {
    for (const q of parsed.questions) {
      allArtifacts.push({ documentId, type: "question", content: { question: q.question, options: q.options, correctAnswer: q.correctAnswer, justification: q.justification, isComplement: q.isComplement || false }, sourceChunkIds: q.sourceChunkIds || [], mode });
    }
  }

  // Validate: mark items without source in faithful mode
  for (const a of allArtifacts) {
    if (mode === "faithful" && a.sourceChunkIds.length === 0) {
      a.content.notFoundInMaterial = true;
    }
  }

  if (allArtifacts.length > 0) await db.createArtifacts(allArtifacts);
  return allArtifacts;
}

// Async document processing
async function processDocument(docId: number, fileUrl: string, mimeType: string, fileBase64: string) {
  try {
    let extractedText = "";
    let ocrConfidence: "high" | "medium" | "low" = "high";

    if (mimeType === "application/pdf") {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "Extraia todo o texto do documento PDF fornecido. Retorne apenas o texto extra\u00eddo, sem formata\u00e7\u00e3o adicional." },
          { role: "user", content: [{ type: "text", text: "Extraia o texto deste documento:" }, { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } }] },
        ],
      });
      const content = result.choices[0]?.message?.content;
      extractedText = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: any) => c.type === "text" ? c.text : "").join("") : "";
      ocrConfidence = "high";
    } else {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "Voc\u00ea \u00e9 um OCR. Extraia TODO o texto vis\u00edvel na imagem. Retorne apenas o texto extra\u00eddo, mantendo a estrutura original." },
          { role: "user", content: [{ type: "text", text: "Extraia o texto desta imagem:" }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}`, detail: "high" } }] },
        ],
      });
      const content = result.choices[0]?.message?.content;
      extractedText = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: any) => c.type === "text" ? c.text : "").join("") : "";
      if (extractedText.length < 50) ocrConfidence = "low";
      else if (extractedText.length < 200) ocrConfidence = "medium";
      else ocrConfidence = "high";
    }

    await db.updateDocumentStatus(docId, "generating", extractedText, ocrConfidence);
    const textChunks = splitTextIntoChunks(extractedText);
    await db.createChunks(docId, textChunks);

    const chunkRows = await db.getDocumentChunks(docId);
    const chunkData = chunkRows.map(c => ({ id: c.id, text: c.textContent }));
    await generateArtifacts(docId, chunkData, "faithful");

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
      .input(z.object({
        folderId: z.number(),
        title: z.string().min(1).max(255),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        const effectivePlan = await db.getEffectivePlan(user.id);
        if (effectivePlan === "free") {
          const today = new Date().toISOString().split("T")[0];
          const usage = await db.getDailyUsage(user.id, today);
          if (usage.conversionCount >= 3) throw new Error("LIMIT_REACHED");
        }
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `docs/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        const docId = await db.createDocument({
          folderId: input.folderId,
          userId: ctx.user.id,
          title: input.title,
          originalFileUrl: url,
          status: "extracting",
        });
        const today = new Date().toISOString().split("T")[0];
        await db.incrementDailyUsage(ctx.user.id, today);
        processDocument(docId, url, input.mimeType, input.fileBase64).catch(err => {
          console.error("[Process] Error:", err);
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
      .input(z.object({ documentId: z.number(), type: z.string().optional(), mode: z.string().optional() }))
      .query(({ input }) => db.getDocumentArtifacts(input.documentId, input.type, input.mode)),
    generate: protectedProcedure
      .input(z.object({ documentId: z.number(), mode: z.enum(["faithful", "deepened", "exam"]) }))
      .mutation(async ({ input }) => {
        const existing = await db.getDocumentArtifacts(input.documentId, undefined, input.mode);
        if (existing.length > 0) return { cached: true, count: existing.length };
        const chunkRows = await db.getDocumentChunks(input.documentId);
        if (chunkRows.length === 0) throw new Error("Documento sem texto extra\u00eddo");
        const chunkData = chunkRows.map(c => ({ id: c.id, text: c.textContent }));
        const artifacts = await generateArtifacts(input.documentId, chunkData, input.mode);
        return { cached: false, count: artifacts.length };
      }),
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
          easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
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
        const flashcards = await db.getDocumentArtifacts(input.documentId, "flashcard");
        const now = new Date();
        const items = flashcards.map(f => ({ userId: ctx.user.id, artifactId: f.id, documentId: input.documentId, nextReviewAt: now }));
        await db.createReviewItems(items);
        return { count: items.length };
      }),
  }),

  usage: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().split("T")[0];
      const usage = await db.getDailyUsage(ctx.user.id, today);
      const plan = await db.getEffectivePlan(ctx.user.id);
      return { conversionsUsed: usage.conversionCount, conversionsLimit: plan === "free" ? 3 : -1, plan };
    }),
  }),
});

export type AppRouter = typeof appRouter;
