import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  revenueCatWebhookEvents,
  subscriptions,
  type InsertRevenueCatWebhookEvent,
  type InsertSubscription,
  users,
} from "../../drizzle/schema";
import type { SubscriptionPlan } from "../../shared/revenuecat";
import { getDb } from "./core";

export async function getActiveSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "trialing"]),
        or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now)),
      ),
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);

  return rows[0];
}

export async function getEffectivePlan(
  userId: number,
  fallbackPlan: SubscriptionPlan = "free",
): Promise<SubscriptionPlan> {
  const db = await getDb();
  if (!db) return fallbackPlan;

  const active = await getActiveSubscriptionByUserId(userId);
  if (!active) return "free";

  return active.plan;
}

export async function upsertRevenueCatSubscription(data: {
  userId: number;
  plan: SubscriptionPlan;
  status: "active" | "trialing" | "billing_issue" | "canceled" | "expired";
  expiresAt?: Date | null;
  revenueCatId: string;
  productId?: string | null;
  entitlementId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertSubscription = {
    userId: data.userId,
    plan: data.plan,
    status: data.status,
    expiresAt: data.expiresAt ?? null,
    revenueCatId: data.revenueCatId,
    productId: data.productId ?? null,
    entitlementId: data.entitlementId ?? null,
  };

  await db.insert(subscriptions).values(values).onDuplicateKeyUpdate({
    set: {
      userId: data.userId,
      plan: data.plan,
      status: data.status,
      expiresAt: data.expiresAt ?? null,
      productId: data.productId ?? null,
      entitlementId: data.entitlementId ?? null,
      updatedAt: new Date(),
    },
  });
}

export async function markRevenueCatWebhookEventProcessed(data: {
  eventId: string;
  appUserId?: string | null;
  eventType?: string | null;
  eventTimestampMs?: number | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertRevenueCatWebhookEvent = {
    eventId: data.eventId,
    appUserId: data.appUserId ?? null,
    eventType: data.eventType ?? null,
    eventTimestampMs: data.eventTimestampMs ?? null,
  };

  try {
    await db.insert(revenueCatWebhookEvents).values(values);
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      return false;
    }
    throw error;
  }
}

export async function syncUserPlanFromSubscriptions(userId: number): Promise<SubscriptionPlan> {
  const db = await getDb();
  if (!db) return "free";

  const activeSubscription = await getActiveSubscriptionByUserId(userId);
  const plan = activeSubscription?.plan ?? "free";

  await db
    .update(users)
    .set({
      subscriptionPlan: plan,
      subscriptionExpiresAt: activeSubscription?.expiresAt ?? null,
    })
    .where(eq(users.id, userId));

  return plan;
}
