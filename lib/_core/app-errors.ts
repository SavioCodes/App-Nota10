const RATE_LIMITED_RETRY_PATTERN = /RATE_LIMITED_RETRY_AFTER_(\d+)_SECONDS/;
const FILE_TOO_LARGE_PATTERN = /FILE_TOO_LARGE_MAX_(\d+)_MB/;
const UNSUPPORTED_MIME_PATTERN = /UNSUPPORTED_MIME_TYPE_(.+)$/;
const TRANSIENT_NETWORK_PATTERNS = [
  /network request failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /fetch failed/i,
  /timeout/i,
  /timed out/i,
  /econnreset/i,
  /socket hang up/i,
];

export type ParsedAppError =
  | { kind: "limit_reached"; message: string }
  | { kind: "rate_limited"; message: string; retryAfterSeconds: number | null }
  | { kind: "file_too_large"; message: string; maxMb: number | null }
  | { kind: "unsupported_mime"; message: string; mimeType: string | null }
  | { kind: "unknown"; message: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return "Erro inesperado.";
}

function hasTransientNetworkCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  const code = (data as { code?: unknown }).code;
  return code === "TIMEOUT" || code === "BAD_GATEWAY" || code === "SERVICE_UNAVAILABLE";
}

function isTooManyRequestsCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  const code = (data as { code?: unknown }).code;
  return code === "TOO_MANY_REQUESTS";
}

function extractRetryAfterSeconds(message: string): number | null {
  const matched = RATE_LIMITED_RETRY_PATTERN.exec(message);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractMaxUploadMb(message: string): number | null {
  const matched = FILE_TOO_LARGE_PATTERN.exec(message);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractUnsupportedMime(message: string): string | null {
  const matched = UNSUPPORTED_MIME_PATTERN.exec(message);
  if (!matched) return null;
  const value = (matched[1] ?? "").trim();
  return value.length > 0 ? value : null;
}

export function parseAppError(error: unknown): ParsedAppError {
  const message = getErrorMessage(error);

  if (message.includes("LIMIT_REACHED")) {
    return { kind: "limit_reached", message };
  }

  if (message.includes("RATE_LIMITED") || isTooManyRequestsCode(error)) {
    return {
      kind: "rate_limited",
      message,
      retryAfterSeconds: extractRetryAfterSeconds(message),
    };
  }

  if (message.includes("FILE_TOO_LARGE_MAX_")) {
    return {
      kind: "file_too_large",
      message,
      maxMb: extractMaxUploadMb(message),
    };
  }

  if (message.includes("UNSUPPORTED_MIME_TYPE_")) {
    return {
      kind: "unsupported_mime",
      message,
      mimeType: extractUnsupportedMime(message),
    };
  }

  return { kind: "unknown", message };
}

export function formatRateLimitHint(retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds) return "Muitas solicitacoes seguidas. Aguarde alguns segundos.";
  return `Muitas solicitacoes seguidas. Aguarde ${retryAfterSeconds}s e tente novamente.`;
}

export function formatUploadLimitHint(maxMb: number | null): string {
  if (!maxMb) return "O arquivo excede o limite permitido para upload.";
  return `O arquivo excede o limite permitido de ${maxMb} MB.`;
}

export function formatUnsupportedMimeHint(mimeType: string | null): string {
  if (!mimeType) return "Tipo de arquivo nao suportado.";
  return `Tipo de arquivo nao suportado (${mimeType}).`;
}

export function isTransientNetworkError(error: unknown): boolean {
  if (hasTransientNetworkCode(error)) return true;
  const message = getErrorMessage(error);
  return TRANSIENT_NETWORK_PATTERNS.some((pattern) => pattern.test(message));
}
