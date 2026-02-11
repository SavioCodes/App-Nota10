import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";

import { normalizeExtractedText } from "./chunker";
import { ENV } from "./env";
import { invokeLLM } from "./llm";

export type OcrConfidence = "high" | "medium" | "low";

export type ExtractionResult = {
  text: string;
  confidence: OcrConfidence;
  method: "native_pdf" | "ocr_pdf" | "ocr_image";
  totalPages?: number;
  usedPages?: number;
};

const MIN_NATIVE_TEXT_TOTAL = 300;
const MIN_NATIVE_TEXT_PER_PAGE = 40;

function normalizeConfidence(value: unknown): OcrConfidence | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return null;
}

function inferConfidenceFromText(text: string, pageCount = 1): OcrConfidence {
  const chars = text.trim().length;
  const charsPerPage = chars / Math.max(1, pageCount);
  if (charsPerPage >= 700 || chars >= 2000) return "high";
  if (charsPerPage >= 200 || chars >= 600) return "medium";
  return "low";
}

export function assertUploadSize(fileBuffer: Buffer) {
  const maxUploadMb = Number.isFinite(ENV.maxUploadMb) ? ENV.maxUploadMb : 15;
  const maxBytes = maxUploadMb * 1024 * 1024;
  if (fileBuffer.byteLength > maxBytes) {
    throw new Error(`FILE_TOO_LARGE_MAX_${maxUploadMb}_MB`);
  }
}

async function extractPdfTextNative(fileBuffer: Buffer): Promise<{ text: string; totalPages: number }> {
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const [info, textResult] = await Promise.all([parser.getInfo(), parser.getText()]);
    const text = normalizeExtractedText(textResult?.text ?? "");
    return {
      text,
      totalPages: info.total ?? 1,
    };
  } finally {
    await parser.destroy();
  }
}

async function limitPdfForOcr(
  fileBuffer: Buffer,
  maxPages: number,
): Promise<{ pdfBase64: string; totalPages: number; usedPages: number }> {
  const source = await PDFDocument.load(fileBuffer);
  const totalPages = source.getPageCount();
  const usedPages = Math.max(1, Math.min(totalPages, maxPages));

  if (usedPages === totalPages) {
    return {
      pdfBase64: fileBuffer.toString("base64"),
      totalPages,
      usedPages,
    };
  }

  const target = await PDFDocument.create();
  const copied = await target.copyPages(
    source,
    Array.from({ length: usedPages }, (_, index) => index),
  );

  for (const page of copied) {
    target.addPage(page);
  }

  const bytes = await target.save();
  return {
    pdfBase64: Buffer.from(bytes).toString("base64"),
    totalPages,
    usedPages,
  };
}

async function extractImageTextWithGemini(fileBase64: string, mimeType: string): Promise<ExtractionResult> {
  const result = await invokeLLM({
    profile: "fast",
    responseFormat: { type: "json_object" },
    mediaResolution: "high",
    messages: [
      {
        role: "system",
        content:
          "Voce e um OCR de alta precisao. Extraia TODO o texto visivel sem inventar. Responda JSON: {\"text\":\"...\", \"confidence\":\"high|medium|low\"}.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia o texto desta imagem mantendo a estrutura." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}`, detail: "high" } },
        ],
      },
    ],
  });

  const content = result.choices[0]?.message?.content;
  const raw = typeof content === "string" ? content : "";

  try {
    const parsed = JSON.parse(raw) as { text?: string; confidence?: string };
    const text = normalizeExtractedText(parsed.text ?? "");
    return {
      text,
      confidence: normalizeConfidence(parsed.confidence) ?? inferConfidenceFromText(text),
      method: "ocr_image",
    };
  } catch {
    const text = normalizeExtractedText(raw);
    return {
      text,
      confidence: inferConfidenceFromText(text),
      method: "ocr_image",
    };
  }
}

async function extractPdfTextWithGemini(
  pdfBase64: string,
  usedPages: number,
  mediaResolution: "medium" | "high",
): Promise<ExtractionResult> {
  const result = await invokeLLM({
    profile: "fast",
    responseFormat: { type: "json_object" },
    mediaResolution,
    messages: [
      {
        role: "system",
        content:
          "Voce e um OCR para PDF. Retorne JSON valido no formato {\"text\":\"...\", \"confidence\":\"high|medium|low\"}. Nao invente conteudo.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extraia o texto das primeiras ${usedPages} paginas deste PDF. Preserve paragrafos e cabecalhos quando possivel.`,
          },
          {
            type: "file_url",
            file_url: {
              url: `data:application/pdf;base64,${pdfBase64}`,
              mime_type: "application/pdf",
            },
          },
        ],
      },
    ],
  });

  const content = result.choices[0]?.message?.content;
  const raw = typeof content === "string" ? content : "";

  try {
    const parsed = JSON.parse(raw) as { text?: string; confidence?: string };
    const text = normalizeExtractedText(parsed.text ?? "");
    return {
      text,
      confidence: normalizeConfidence(parsed.confidence) ?? inferConfidenceFromText(text, usedPages),
      method: "ocr_pdf",
      usedPages,
    };
  } catch {
    const text = normalizeExtractedText(raw);
    return {
      text,
      confidence: inferConfidenceFromText(text, usedPages),
      method: "ocr_pdf",
      usedPages,
    };
  }
}

export async function extractDocumentText(params: {
  fileBuffer: Buffer;
  fileBase64: string;
  mimeType: string;
}): Promise<ExtractionResult> {
  const normalizedMimeType = params.mimeType.toLowerCase();

  if (normalizedMimeType !== "application/pdf") {
    return extractImageTextWithGemini(params.fileBase64, params.mimeType);
  }

  const native = await extractPdfTextNative(params.fileBuffer);
  const nativeCharsPerPage = native.text.length / Math.max(1, native.totalPages);
  const hasEnoughNativeText =
    native.text.length >= MIN_NATIVE_TEXT_TOTAL && nativeCharsPerPage >= MIN_NATIVE_TEXT_PER_PAGE;

  if (hasEnoughNativeText) {
    return {
      text: native.text,
      confidence: inferConfidenceFromText(native.text, native.totalPages),
      method: "native_pdf",
      totalPages: native.totalPages,
      usedPages: native.totalPages,
    };
  }

  const maxPages = Number.isFinite(ENV.maxPdfPagesOcr) ? ENV.maxPdfPagesOcr : 30;
  const limitedPdf = await limitPdfForOcr(params.fileBuffer, maxPages);

  let ocr = await extractPdfTextWithGemini(limitedPdf.pdfBase64, limitedPdf.usedPages, "medium");
  if (ocr.confidence === "low") {
    const highRes = await extractPdfTextWithGemini(limitedPdf.pdfBase64, limitedPdf.usedPages, "high");
    if (highRes.text.length > ocr.text.length) {
      ocr = highRes;
    }
  }

  const finalText = ocr.text.length > native.text.length ? ocr.text : native.text;
  const confidence = inferConfidenceFromText(finalText, limitedPdf.usedPages);

  return {
    text: finalText,
    confidence,
    method: "ocr_pdf",
    totalPages: limitedPdf.totalPages,
    usedPages: limitedPdf.usedPages,
  };
}
