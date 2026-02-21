import { TRPCError } from "@trpc/server";
import { consumeRateLimit } from "../_core/rate-limit";
import * as db from "../db";

export function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

function sanitizeLimit(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized <= 0) return fallback;
  return normalized;
}

export function assertUserRateLimit(params: {
  scope: "upload" | "artifacts_generate";
  userId: number;
  configuredLimit: number;
  configuredWindowMs: number;
}) {
  const limit = sanitizeLimit(params.configuredLimit, 1);
  const windowMs = sanitizeLimit(params.configuredWindowMs, 60_000);
  const result = consumeRateLimit({
    key: `${params.scope}:${params.userId}`,
    limit,
    windowMs,
  });

  if (result.allowed) return;

  const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `RATE_LIMITED_RETRY_AFTER_${retryAfterSeconds}_SECONDS`,
  });
}

export async function assertConversionAllowed(userId: number) {
  const plan = await db.getEffectivePlan(userId);
  if (plan !== "free") return plan;

  const usage = await db.getDailyUsage(userId, getTodayIsoDate());
  if (usage.conversionCount >= 3) {
    throw new Error("LIMIT_REACHED");
  }
  return plan;
}

export async function consumeConversionIfNeeded(
  userId: number,
  plan: Awaited<ReturnType<typeof db.getEffectivePlan>>,
) {
  if (plan !== "free") return;
  await db.incrementDailyUsage(userId, getTodayIsoDate());
}
