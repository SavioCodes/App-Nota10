import { describe, expect, it } from "vitest";

import { formatRateLimitHint, parseAppError } from "../lib/_core/app-errors";

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
});

describe("formatRateLimitHint", () => {
  it("formats retry hint when retry time is provided", () => {
    expect(formatRateLimitHint(12)).toContain("12s");
  });

  it("returns default hint when retry time is unavailable", () => {
    expect(formatRateLimitHint(null)).toBe("Muitas solicitacoes seguidas. Aguarde alguns segundos.");
  });
});
