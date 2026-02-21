import type { EntitlementState, SubscriptionPlan } from "../../shared/billing";
import { ENV } from "../_core/env";
import * as db from "../db";

function planRank(plan: SubscriptionPlan): number {
  if (plan === "pro_enem") return 2;
  if (plan === "pro") return 1;
  return 0;
}

function pickHigherPlan(current: EntitlementState, candidate: EntitlementState): EntitlementState {
  if (planRank(candidate.plan) > planRank(current.plan)) return candidate;
  if (planRank(candidate.plan) < planRank(current.plan)) return current;

  const currentExpiry = current.expiresAt?.getTime() ?? 0;
  const candidateExpiry = candidate.expiresAt?.getTime() ?? 0;
  return candidateExpiry > currentExpiry ? candidate : current;
}

function toStateFromSubscription(
  subscription:
    | Awaited<ReturnType<typeof db.getActiveSubscriptionByUserId>>
    | null
    | undefined,
): EntitlementState | null {
  if (!subscription) return null;
  const provider =
    (subscription.provider as EntitlementState["provider"]) ??
    (subscription.revenueCatId ? "revenuecat_legacy" : null);

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

  // During migration, legacy RevenueCat entries can coexist with newer providers.
  if (!ENV.billingRevenuecatLegacyEnabled) {
    return primary.provider === "revenuecat_legacy" ? fallback : primary;
  }

  const legacy =
    primary.provider === "revenuecat_legacy"
      ? primary
      : await (async () => {
          const candidate = await db.getActiveSubscriptionByUserId(userId, "revenuecat_legacy");
          return toStateFromSubscription(candidate);
        })();

  if (!legacy) return primary;
  return pickHigherPlan(primary, legacy);
}

export async function getEffectivePlan(userId: number): Promise<SubscriptionPlan> {
  const entitlement = await getEffectiveEntitlement(userId);
  return entitlement.plan;
}
