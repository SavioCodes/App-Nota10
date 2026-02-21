import { toDbArtifacts, parseArtifactBundle, validateArtifactBundleSources } from "../_core/artifacts";
import { chunkTextDeterministic, computeTextHash, normalizeExtractedText } from "../_core/chunker";
import { extractDocumentText } from "../_core/extraction";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { assertConversionAllowed, consumeConversionIfNeeded } from "./usage-limits.service";

export type ArtifactMode = "faithful" | "deepened" | "exam";
type ChunkData = { id: number; text: string };

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object" || !("type" in part)) return "";
      const maybeTextPart = part as { type?: unknown; text?: unknown };
      if (maybeTextPart.type === "text" && typeof maybeTextPart.text === "string") {
        return maybeTextPart.text;
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

export async function generateArtifactsForDocument(args: {
  documentId: number;
  mode: ArtifactMode;
  userId: number;
  consumeUsage: boolean;
}) {
  const document = await db.getDocument(args.documentId, args.userId);
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");

  const chunkRows = await db.getDocumentChunks(args.documentId, args.userId);
  if (chunkRows.length === 0) throw new Error("Documento sem texto extraido");

  const chunks: ChunkData[] = chunkRows.map((chunk) => ({ id: chunk.id, text: chunk.textContent }));
  const sourceHash = document.textHash ?? computeTextHash(chunks.map((chunk) => chunk.text).join("\n\n"));

  const cached = await db.getDocumentArtifacts(
    args.documentId,
    undefined,
    args.mode,
    sourceHash,
    args.userId,
  );
  if (cached.length > 0) {
    await db.syncReviewItemsForDocument({
      userId: args.userId,
      documentId: args.documentId,
      sourceHash,
    });
    return { cached: true, count: cached.length };
  }

  const plan = args.consumeUsage
    ? await assertConversionAllowed(args.userId)
    : await db.getEffectivePlan(args.userId);

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
  await db.syncReviewItemsForDocument({
    userId: args.userId,
    documentId: args.documentId,
    sourceHash,
  });
  if (args.consumeUsage) {
    await consumeConversionIfNeeded(args.userId, plan);
  }

  return { cached: false, count: rows.length };
}

/**
 * Full ingestion pipeline for uploaded documents: OCR/text extraction, chunking,
 * faithful artifact generation, and final status transition.
 */
export async function processDocument(
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
    const currentDocument = await db.getDocument(docId, userId);
    const existingChunks = await db.getDocumentChunks(docId, userId);
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
