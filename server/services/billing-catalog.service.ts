import { DEFAULT_BILLING_CATALOG, type BillingCatalogPlan } from "../../shared/billing";

function parseCatalogJson(raw: string | undefined): BillingCatalogPlan[] | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as BillingCatalogPlan[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((plan) => Boolean(plan && plan.id && plan.webProductId));
  } catch {
    return null;
  }
}

export function getBillingCatalog(): BillingCatalogPlan[] {
  const custom = parseCatalogJson(process.env.BILLING_CATALOG_JSON);
  if (custom && custom.length > 0) return custom;
  return DEFAULT_BILLING_CATALOG;
}

export function findCatalogPlanByWebProductId(webProductId: string): BillingCatalogPlan | undefined {
  return getBillingCatalog().find((plan) => plan.webProductId === webProductId && plan.enabled);
}
