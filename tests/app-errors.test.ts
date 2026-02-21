import { describe, expect, it } from "vitest";

import {
  formatRateLimitHint,
  formatUnsupportedMimeHint,
  formatUploadLimitHint,
  parseAppError,
} from "../lib/_core/app-errors";

describe("parseAppError", () => {
  it("detects free-plan conversion limit errors", () => {
    const parsed = parseAppError(new Error("LIMIT_REACHED"));
    expect(parsed.kind).toBe("limit_reached");
  });

  it("extracts retry seconds from rate limit messages", () => {
    const parsed = parseAppError(new Error("RATE_LIMITED_RETRY_AFTER_17_SECONDS"));
    expect(parsed.kind).toBe("rate_limited");
    if (parsed.kind === "rate_limited") {
      expect(parsed.retryAfterSeconds).toBe(17);
    }
  });

  it("detects rate limit from trpc error code fallback", () => {
    const parsed = parseAppError({
      message: "Too many requests",
      data: { code: "TOO_MANY_REQUESTS" },
    });
    expect(parsed.kind).toBe("rate_limited");
    if (parsed.kind === "rate_limited") {
      expect(parsed.retryAfterSeconds).toBeNull();
    }
  });

  it("keeps unknown errors untouched", () => {
    const parsed = parseAppError(new Error("Something else failed"));
    expect(parsed.kind).toBe("unknown");
    expect(parsed.message).toBe("Something else failed");
  });

  it("detects upload size errors and extracts server limit", () => {
    const parsed = parseAppError(new Error("FILE_TOO_LARGE_MAX_15_MB"));
    expect(parsed.kind).toBe("file_too_large");
    if (parsed.kind === "file_too_large") {
      expect(parsed.maxMb).toBe(15);
    }
  });

  it("detects unsupported mime errors and extracts mime type", () => {
    const parsed = parseAppError(new Error("UNSUPPORTED_MIME_TYPE_application/zip"));
    expect(parsed.kind).toBe("unsupported_mime");
    if (parsed.kind === "unsupported_mime") {
      expect(parsed.mimeType).toBe("application/zip");
    }
  });
});

describe("formatRateLimitHint", () => {
  it("formats retry hint when retry time is provided", () => {
    expect(formatRateLimitHint(12)).toContain("12s");
  });

  it("returns default hint when retry time is unavailable", () => {
    expect(formatRateLimitHint(null)).toBe("Muitas solicitacoes seguidas. Aguarde alguns segundos.");
  });
});

describe("upload formatting helpers", () => {
  it("formats upload limit hint with server maximum", () => {
    expect(formatUploadLimitHint(15)).toContain("15 MB");
  });

  it("formats fallback upload limit hint when value is missing", () => {
    expect(formatUploadLimitHint(null)).toContain("limite permitido");
  });

  it("formats unsupported mime hint with mime value", () => {
    expect(formatUnsupportedMimeHint("application/zip")).toContain("application/zip");
  });

  it("formats unsupported mime fallback hint", () => {
    expect(formatUnsupportedMimeHint(null)).toBe("Tipo de arquivo nao suportado.");
  });
});
