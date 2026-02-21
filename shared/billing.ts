export type SubscriptionPlan = "free" | "pro" | "pro_enem";

export type SubscriptionProvider =
  | "app_store"
  | "google_play"
  | "mercado_pago"
  | "revenuecat_legacy";

export type AuthProvider = "supabase_google" | "supabase_apple" | "legacy_oauth";

export type EntitlementState = {
  plan: SubscriptionPlan;
  provider: SubscriptionProvider | null;
  expiresAt: Date | null;
  source: "subscription" | "fallback";
};

export type BillingCatalogPlan = {
  id: Exclude<SubscriptionPlan, "free">;
  displayName: string;
  monthlyPriceCents: number;
  currency: "BRL";
  webProductId: string;
  iosProductId: string;
  androidProductId: string;
  enabled: boolean;
};

export const DEFAULT_BILLING_CATALOG: BillingCatalogPlan[] = [
  {
    id: "pro",
    displayName: "Pro",
    monthlyPriceCents: 2990,
    currency: "BRL",
    webProductId: "nota10_pro_monthly",
    iosProductId: "nota10_pro_monthly",
    androidProductId: "nota10_pro_monthly",
    enabled: true,
  },
  {
    id: "pro_enem",
    displayName: "Pro+ ENEM",
    monthlyPriceCents: 4990,
    currency: "BRL",
    webProductId: "nota10_pro_enem_monthly",
    iosProductId: "nota10_pro_enem_monthly",
    androidProductId: "nota10_pro_enem_monthly",
    enabled: true,
  },
];
