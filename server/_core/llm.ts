import { randomUUID } from "node:crypto";

import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type LlmProfile = "fast" | "strict";
export type StudyMode = "faithful" | "deepened" | "exam";
export type ThinkingLevel = "low" | "medium" | "high";
export type MediaResolution = "low" | "medium" | "high";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4"
      | "image/png"
      | "image/jpeg"
      | "application/octet-stream";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  profile?: LlmProfile;
  mode?: StudyMode;
  model?: string;
  mediaResolution?: MediaResolution;
  thinkingLevel?: ThinkingLevel;
  temperature?: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: Role;
      content: string | (TextContent | ImageContent | FileContent)[];
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType?: string;
    fileUri: string;
  };
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type NormalizedInvokeRequest = {
  model: string;
  apiKey: string;
  contents: GeminiContent[];
  systemInstruction?: {
    parts: GeminiPart[];
  };
  generationConfig: Record<string, unknown>;
};

export type LlmAdapter = {
  invoke: (params: InvokeParams) => Promise<InvokeResult>;
};

const VALID_THINKING_LEVELS = new Set<ThinkingLevel>(["low", "medium", "high"]);
const VALID_MEDIA_RESOLUTIONS = new Set<MediaResolution>(["low", "medium", "high"]);

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

const toBase64 = (data: ArrayBuffer) => Buffer.from(data).toString("base64");

const dataUrlPattern = /^data:([^;,]+);base64,(.+)$/i;

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = dataUrlPattern.exec(url.trim());
  if (!match) return null;
  return {
    mimeType: match[1] ?? "application/octet-stream",
    data: match[2] ?? "",
  };
}

async function urlToInlineData(
  url: string,
  fallbackMimeType?: string,
): Promise<{ mimeType: string; data: string }> {
  const parsed = parseDataUrl(url);
  if (parsed) {
    return parsed;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch media URL (${response.status} ${response.statusText}): ${body}`.trim(),
    );
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    fallbackMimeType ||
    "application/octet-stream";
  const data = toBase64(await response.arrayBuffer());
  return { mimeType, data };
}

function normalizeRole(role: Role): "user" | "model" | "system" {
  if (role === "assistant") return "model";
  if (role === "system") return "system";
  return "user";
}

async function toGeminiParts(content: MessageContent | MessageContent[]): Promise<GeminiPart[]> {
  const normalized = ensureArray(content);
  const parts: GeminiPart[] = [];

  for (const part of normalized) {
    if (typeof part === "string") {
      if (part.trim().length > 0) parts.push({ text: part });
      continue;
    }

    if (part.type === "text") {
      if (part.text.trim().length > 0) parts.push({ text: part.text });
      continue;
    }

    if (part.type === "image_url") {
      const detail = part.image_url.detail;
      const inlineData = await urlToInlineData(part.image_url.url, "image/jpeg");
      parts.push({ inlineData });

      // Keep the image detail as auxiliary instruction for better OCR behavior.
      if (detail && detail !== "auto") {
        parts.push({
          text: `image_detail_hint=${detail}`,
        });
      }
      continue;
    }

    if (part.type === "file_url") {
      const parsed = parseDataUrl(part.file_url.url);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: part.file_url.mime_type || parsed.mimeType,
            data: parsed.data,
          },
        });
        continue;
      }

      // Prefer inline data for compatibility. Falls back to file URI only if fetch fails.
      try {
        const inlineData = await urlToInlineData(part.file_url.url, part.file_url.mime_type);
        parts.push({ inlineData });
      } catch {
        parts.push({
          fileData: {
            fileUri: part.file_url.url,
            mimeType: part.file_url.mime_type,
          },
        });
      }
      continue;
    }

    throw new Error("Unsupported message content part");
  }

  return parts;
}

function extractTextFromGeminiResponse(payload: any): string {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (text) return text;

  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini response has no text output (finishReason=${candidate.finishReason})`);
  }

  return "";
}

function normalizeResponseFormat(
  params: Pick<InvokeParams, "responseFormat" | "response_format" | "outputSchema" | "output_schema">,
): ResponseFormat | undefined {
  const explicitFormat = params.responseFormat || params.response_format;
  if (explicitFormat) return explicitFormat;

  const schema = params.outputSchema || params.output_schema;
  if (!schema) return undefined;

  return {
    type: "json_schema",
    json_schema: schema,
  };
}

function resolveThinkingLevel(params: InvokeParams): ThinkingLevel {
  if (params.thinkingLevel && VALID_THINKING_LEVELS.has(params.thinkingLevel)) {
    return params.thinkingLevel;
  }

  if (params.profile === "strict") {
    const strictLevel = ENV.geminiThinkingLevelStrict.toLowerCase() as ThinkingLevel;
    if (VALID_THINKING_LEVELS.has(strictLevel)) return strictLevel;
    return "high";
  }

  if (params.mode === "exam") return "high";

  const fastLevel = ENV.geminiThinkingLevelFast.toLowerCase() as ThinkingLevel;
  if (VALID_THINKING_LEVELS.has(fastLevel)) return fastLevel;
  return "medium";
}

function resolveModel(params: InvokeParams): string {
  if (params.model && params.model.trim().length > 0) return params.model;
  if (params.profile === "strict") return ENV.geminiStrictModel;
  return ENV.geminiFastModel;
}

function resolveMediaResolution(params: InvokeParams): MediaResolution | undefined {
  if (!params.mediaResolution) return undefined;
  if (VALID_MEDIA_RESOLUTIONS.has(params.mediaResolution)) return params.mediaResolution;
  return undefined;
}

function assertGeminiApiKey() {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
}

async function buildGeminiRequest(params: InvokeParams): Promise<NormalizedInvokeRequest> {
  assertGeminiApiKey();

  const systemMessages = params.messages.filter((msg) => normalizeRole(msg.role) === "system");
  const nonSystemMessages = params.messages.filter((msg) => normalizeRole(msg.role) !== "system");

  if (nonSystemMessages.length === 0) {
    throw new Error("invokeLLM requires at least one non-system message");
  }

  const contents: GeminiContent[] = [];
  for (const message of nonSystemMessages) {
    const role = normalizeRole(message.role);
    const parts = await toGeminiParts(message.content);
    if (parts.length === 0) continue;
    contents.push({
      role: role === "model" ? "model" : "user",
      parts,
    });
  }

  if (contents.length === 0) {
    throw new Error("invokeLLM could not build Gemini contents from provided messages");
  }

  const systemInstructionText = systemMessages
    .map((msg) => ensureArray(msg.content))
    .flat()
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .join("\n\n")
    .trim();

  const responseFormat = normalizeResponseFormat(params);
  const generationConfig: Record<string, unknown> = {};
  generationConfig.maxOutputTokens = params.maxTokens ?? params.max_tokens ?? 32768;
  generationConfig.thinkingConfig = {
    thinkingLevel: resolveThinkingLevel(params),
  };

  if (typeof params.temperature === "number") {
    generationConfig.temperature = params.temperature;
  }

  const mediaResolution = resolveMediaResolution(params);
  if (mediaResolution) {
    generationConfig.mediaResolution = mediaResolution;
  }

  if (responseFormat?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  if (responseFormat?.type === "json_schema") {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = responseFormat.json_schema.schema;
  }

  return {
    model: resolveModel(params),
    apiKey: ENV.geminiApiKey,
    contents,
    systemInstruction: systemInstructionText
      ? {
          parts: [{ text: systemInstructionText }],
        }
      : undefined,
    generationConfig,
  };
}

async function invokeGeminiRest(params: InvokeParams): Promise<InvokeResult> {
  const request = await buildGeminiRequest(params);
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
  );
  endpoint.searchParams.set("key", request.apiKey);

  const payload: Record<string, unknown> = {
    contents: request.contents,
    generationConfig: request.generationConfig,
  };
  if (request.systemInstruction) {
    payload.systemInstruction = request.systemInstruction;
  }

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini invoke failed: ${response.status} ${response.statusText} - ${rawText}`);
  }

  const body = rawText ? JSON.parse(rawText) : {};
  const content = extractTextFromGeminiResponse(body);
  const usage = body?.usageMetadata;

  return {
    id: body?.responseId ?? randomUUID(),
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: body?.candidates?.[0]?.finishReason ?? null,
      },
    ],
    usage: usage
      ? {
          prompt_tokens: usage.promptTokenCount ?? 0,
          completion_tokens: usage.candidatesTokenCount ?? 0,
          total_tokens: usage.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

class GeminiRestAdapter implements LlmAdapter {
  async invoke(params: InvokeParams): Promise<InvokeResult> {
    return invokeGeminiRest(params);
  }
}

let activeAdapter: LlmAdapter = new GeminiRestAdapter();

export function setLlmAdapter(adapter: LlmAdapter) {
  activeAdapter = adapter;
}

export function resetLlmAdapter() {
  activeAdapter = new GeminiRestAdapter();
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  return activeAdapter.invoke(params);
}
