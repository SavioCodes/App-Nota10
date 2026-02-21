const RATE_LIMITED_RETRY_PATTERN = /RATE_LIMITED_RETRY_AFTER_(\d+)_SECONDS/;

export type ParsedAppError =
  | { kind: "limit_reached"; message: string }
  | { kind: "rate_limited"; message: string; retryAfterSeconds: number | null }
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

  return { kind: "unknown", message };
}

export function formatRateLimitHint(retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds) return "Muitas solicitacoes seguidas. Aguarde alguns segundos.";
  return `Muitas solicitacoes seguidas. Aguarde ${retryAfterSeconds}s e tente novamente.`;
}
