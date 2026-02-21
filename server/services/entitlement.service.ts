import type { EntitlementState, SubscriptionPlan } from "../../shared/billing";
import * as db from "../db";

function toStateFromSubscription(
  subscription:
    | Awaited<ReturnType<typeof db.getActiveSubscriptionByUserId>>
    | null
    | undefined,
): EntitlementState | null {
  if (!subscription) return null;
  const provider =
    subscription.provider === "app_store" ||
    subscription.provider === "google_play" ||
    subscription.provider === "mercado_pago"
      ? subscription.provider
      : null;

  return {
    plan: subscription.plan,
    provider,
    expiresAt: subscription.expiresAt ?? null,
    source: "subscription",
  };
}

export async function getEffectiveEntitlement(userId: number): Promise<EntitlementState> {
  const fallback: EntitlementState = {
    plan: "free",
    provider: null,
    expiresAt: null,
    source: "fallback",
  };

  const active = await db.getActiveSubscriptionByUserId(userId);
  const primary = toStateFromSubscription(active);
  if (!primary) return fallback;
  return primary.provider ? primary : fallback;
}

export async function getEffectivePlan(userId: number): Promise<SubscriptionPlan> {
  const entitlement = await getEffectiveEntitlement(userId);
  return entitlement.plan;
}
