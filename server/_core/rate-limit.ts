type RateLimitBucket = {
  count: number;
  windowStartMs: number;
};

type ConsumeRateLimitParams = {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAtMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 20_000;
const SWEEP_INTERVAL = 500;
let callsSinceSweep = 0;

function normalizePositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized <= 0) return fallback;
  return normalized;
}

function sweepExpiredBuckets(nowMs: number) {
  callsSinceSweep += 1;
  if (callsSinceSweep % SWEEP_INTERVAL !== 0 && buckets.size <= MAX_BUCKETS) return;

  for (const [key, bucket] of buckets.entries()) {
    if (nowMs - bucket.windowStartMs > 10 * 60_000) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) return;

  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (buckets.size <= MAX_BUCKETS) break;
    if (removed > MAX_BUCKETS) break;
  }
}

export function consumeRateLimit(params: ConsumeRateLimitParams): RateLimitResult {
  const nowMs = params.nowMs ?? Date.now();
  const limit = normalizePositiveInteger(params.limit, 1);
  const windowMs = normalizePositiveInteger(params.windowMs, 60_000);
  const key = `${params.key}::${windowMs}`;

  sweepExpiredBuckets(nowMs);

  const existing = buckets.get(key);
  if (!existing || nowMs - existing.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: nowMs });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterMs: 0,
      resetAtMs: nowMs + windowMs,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(1, existing.windowStartMs + windowMs - nowMs),
      resetAtMs: existing.windowStartMs + windowMs,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: 0,
    resetAtMs: existing.windowStartMs + windowMs,
  };
}

export function resetRateLimitState() {
  buckets.clear();
  callsSinceSweep = 0;
}
