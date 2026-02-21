import type { SubscriptionPlan } from "./billing";

export const REVENUECAT_PRODUCT_IDS = {
  pro: "nota10_pro_monthly",
  proEnem: "nota10_pro_enem_monthly",
} as const;

export const PRODUCT_ID_TO_PLAN: Record<string, Exclude<SubscriptionPlan, "free">> = {
  [REVENUECAT_PRODUCT_IDS.pro]: "pro",
  [REVENUECAT_PRODUCT_IDS.proEnem]: "pro_enem",
};

export function planFromRevenueCatProductId(productId: string | null | undefined): SubscriptionPlan {
  if (!productId) return "free";
  return PRODUCT_ID_TO_PLAN[productId] ?? "free";
}
