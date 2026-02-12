import { afterEach, describe, expect, it } from "vitest";

import { consumeRateLimit, resetRateLimitState } from "../server/_core/rate-limit";

describe("consumeRateLimit", () => {
  afterEach(() => {
    resetRateLimitState();
  });

  it("blocks requests above the limit inside the same window", () => {
    const nowMs = 1_700_000_000_000;
    const first = consumeRateLimit({ key: "user:1:upload", limit: 2, windowMs: 60_000, nowMs });
    const second = consumeRateLimit({ key: "user:1:upload", limit: 2, windowMs: 60_000, nowMs: nowMs + 1_000 });
    const third = consumeRateLimit({ key: "user:1:upload", limit: 2, windowMs: 60_000, nowMs: nowMs + 2_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets the counter after the time window", () => {
    const nowMs = 1_700_000_000_000;
    consumeRateLimit({ key: "user:2:artifacts", limit: 1, windowMs: 10_000, nowMs });

    const blocked = consumeRateLimit({
      key: "user:2:artifacts",
      limit: 1,
      windowMs: 10_000,
      nowMs: nowMs + 100,
    });
    const allowedAfterWindow = consumeRateLimit({
      key: "user:2:artifacts",
      limit: 1,
      windowMs: 10_000,
      nowMs: nowMs + 10_100,
    });

    expect(blocked.allowed).toBe(false);
    expect(allowedAfterWindow.allowed).toBe(true);
  });
});
