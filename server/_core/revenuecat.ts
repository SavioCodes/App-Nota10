import type { Express, Request, Response } from "express";

import { planFromRevenueCatProductId } from "../../shared/revenuecat";
import * as db from "../db";
import { ENV } from "./env";

type RevenueCatWebhookEvent = {
  type?: string;
  app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
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

export function registerRevenueCatWebhookRoutes(app: Express) {
  app.post("/api/revenuecat/webhook", async (req: Request, res: Response) => {
    try {
      if (ENV.revenueCatWebhookSecret) {
        const token = getWebhookToken(req);
        if (token !== ENV.revenueCatWebhookSecret) {
          res.status(401).json({ error: "unauthorized" });
          return;
        }
      }

      const payload = req.body as RevenueCatWebhookBody;
      const event = payload?.event ?? (req.body as RevenueCatWebhookEvent);

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
