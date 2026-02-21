import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  billingWebhookEvents,
  subscriptions,
  type InsertSubscription,
  users,
} from "../../drizzle/schema";
import type { SubscriptionPlan, SubscriptionProvider } from "../../shared/billing";
import { getDb } from "./core";

export async function getActiveSubscriptionByUserId(userId: number, provider?: SubscriptionProvider) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const conditions = [
    eq(subscriptions.userId, userId),
    inArray(subscriptions.status, ["active", "trialing"]),
    or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now)),
  ];

  if (provider) {
    conditions.push(eq(subscriptions.provider, provider));
  }

  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(...conditions))
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

export async function upsertSubscription(data: {
  userId: number;
  plan: SubscriptionPlan;
  status: "active" | "trialing" | "billing_issue" | "canceled" | "expired";
  expiresAt?: Date | null;
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  providerCustomerId?: string | null;
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
    provider: data.provider,
    providerSubscriptionId: data.providerSubscriptionId,
    providerCustomerId: data.providerCustomerId ?? null,
    productId: data.productId ?? null,
    entitlementId: data.entitlementId ?? null,
  };

  await db.insert(subscriptions).values(values).onConflictDoUpdate({
    target: [subscriptions.provider, subscriptions.providerSubscriptionId],
    set: {
      userId: data.userId,
      plan: data.plan,
      status: data.status,
      expiresAt: data.expiresAt ?? null,
      providerCustomerId: data.providerCustomerId ?? null,
      productId: data.productId ?? null,
      entitlementId: data.entitlementId ?? null,
      updatedAt: new Date(),
    },
  });
}

export async function markBillingWebhookEventProcessed(data: {
  provider: SubscriptionProvider;
  eventId: string;
  eventType?: string | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(billingWebhookEvents)
    .values({
      provider: data.provider,
      eventId: data.eventId,
      eventType: data.eventType ?? null,
    })
    .onConflictDoNothing({
      target: [billingWebhookEvents.provider, billingWebhookEvents.eventId],
    })
    .returning({ id: billingWebhookEvents.id });

  return result.length > 0;
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
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return plan;
}
