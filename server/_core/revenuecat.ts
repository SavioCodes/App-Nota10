import type { Express, Request, Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";

import { planFromRevenueCatProductId } from "../../shared/revenuecat";
import * as db from "../db";
import { ENV } from "./env";
import { consumeRateLimit } from "./rate-limit";

type RevenueCatWebhookEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
};

type RevenueCatWebhookBody = {
  event?: RevenueCatWebhookEvent;
};

function getEventStatus(type: string | undefined): "active" | "trialing" | "billing_issue" | "canceled" | "expired" {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
      return "active";
    case "TRIAL_STARTED":
      return "trialing";
    case "BILLING_ISSUE":
      return "billing_issue";
    case "CANCELLATION":
    case "SUBSCRIPTION_PAUSED":
      return "canceled";
    case "EXPIRATION":
      return "expired";
    default:
      return "active";
  }
}

function getWebhookToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") return null;
  const normalized = authHeader.trim();
  if (!normalized.toLowerCase().startsWith("bearer ")) return null;
  return normalized.slice("bearer ".length).trim();
}

function secureTokenEquals(expected: string, received: string | null) {
  if (!received) return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizePositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized <= 0) return fallback;
  return normalized;
}

function getRequesterKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() ?? "unknown";
  }

  return req.ip || "unknown";
}

function computeFallbackEventId(event: RevenueCatWebhookEvent) {
  const serialized = JSON.stringify({
    type: event.type ?? "",
    app_user_id: event.app_user_id ?? "",
    product_id: event.product_id ?? "",
    expiration_at_ms: event.expiration_at_ms ?? null,
    event_timestamp_ms: event.event_timestamp_ms ?? null,
  });

  return `fallback_${createHash("sha256").update(serialized).digest("hex")}`;
}

function resolveEventId(event: RevenueCatWebhookEvent) {
  const eventId = event.id?.trim();
  if (eventId) return eventId;
  return computeFallbackEventId(event);
}

function isWithinWebhookTimeTolerance(eventTimestampMs: number | undefined): boolean {
  if (typeof eventTimestampMs !== "number" || !Number.isFinite(eventTimestampMs)) return true;
  const toleranceSeconds = normalizePositiveInteger(ENV.revenueCatWebhookToleranceSeconds, 86_400);
  const toleranceMs = toleranceSeconds * 1000;
  const delta = Math.abs(Date.now() - eventTimestampMs);
  return delta <= toleranceMs;
}

export function registerRevenueCatWebhookRoutes(app: Express) {
  app.post("/api/revenuecat/webhook", async (req: Request, res: Response) => {
    try {
      const rateLimit = consumeRateLimit({
        key: `revenuecat_webhook:${getRequesterKey(req)}`,
        limit: normalizePositiveInteger(ENV.rateLimitRevenueCatMax, 120),
        windowMs: normalizePositiveInteger(ENV.rateLimitRevenueCatWindowMs, 60_000),
      });

      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
        res
          .status(429)
          .setHeader("Retry-After", String(retryAfterSeconds))
          .json({ error: "rate_limited", retryAfterSeconds });
        return;
      }

      if (ENV.revenueCatWebhookSecret) {
        const token = getWebhookToken(req);
        if (!secureTokenEquals(ENV.revenueCatWebhookSecret, token)) {
          res.status(401).json({ error: "unauthorized" });
          return;
        }
      } else if (ENV.isProduction) {
        res.status(500).json({ error: "revenuecat webhook secret missing" });
        return;
      }

      const payload = req.body as RevenueCatWebhookBody;
      const event = payload?.event ?? (req.body as RevenueCatWebhookEvent);
      const eventId = resolveEventId(event);

      if (!isWithinWebhookTimeTolerance(event.event_timestamp_ms)) {
        res.status(400).json({ error: "event_timestamp_out_of_tolerance" });
        return;
      }

      const wasInserted = await db.markRevenueCatWebhookEventProcessed({
        eventId,
        appUserId: event.app_user_id ?? null,
        eventType: event.type ?? null,
        eventTimestampMs:
          typeof event.event_timestamp_ms === "number" && Number.isFinite(event.event_timestamp_ms)
            ? event.event_timestamp_ms
            : null,
      });

      if (!wasInserted) {
        res.status(200).json({ ok: true, duplicated: true });
        return;
      }

      const appUserId = event?.app_user_id;
      if (!appUserId) {
        res.status(200).json({ ok: true, ignored: true, reason: "missing app_user_id" });
        return;
      }

      const user = await db.getUserByOpenId(appUserId);
      if (!user) {
        res.status(200).json({ ok: true, ignored: true, reason: "user not found" });
        return;
      }

      const plan = planFromRevenueCatProductId(event.product_id);
      if (plan === "free") {
        await db.syncUserPlanFromSubscriptions(user.id);
        res.status(200).json({ ok: true, ignored: true, reason: "unknown product id" });
        return;
      }

      const expiresAt =
        typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;

      await db.upsertRevenueCatSubscription({
        userId: user.id,
        plan,
        status: getEventStatus(event.type),
        expiresAt,
        revenueCatId: appUserId,
        productId: event.product_id ?? null,
        entitlementId: event.entitlement_ids?.[0] ?? null,
      });

      await db.syncUserPlanFromSubscriptions(user.id);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[RevenueCat] webhook failed:", error);
      res.status(500).json({ error: "webhook failed" });
    }
  });
}
