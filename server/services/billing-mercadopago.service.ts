import { ENV } from "../_core/env";
import type { BillingCatalogPlan, SubscriptionPlan } from "../../shared/billing";

type MercadoPagoPreapprovalResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
  status?: string;
  external_reference?: string;
  payer_email?: string;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
  };
  next_payment_date?: string | null;
};

function assertMercadoPagoEnabled() {
  if (!ENV.billingMercadoPagoWebEnabled) {
    throw new Error("BILLING_MERCADOPAGO_WEB_DISABLED");
  }
  if (!ENV.mercadoPagoAccessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN_MISSING");
  }
}

function mapMercadoPagoStatus(status: string | undefined):
  | "active"
  | "trialing"
  | "billing_issue"
  | "canceled"
  | "expired" {
  const normalized = (status ?? "").toLowerCase();
  if (["authorized", "active", "pending"].includes(normalized)) return "active";
  if (["paused"].includes(normalized)) return "billing_issue";
  if (["cancelled", "cancelled_by_user", "terminated"].includes(normalized)) return "canceled";
  if (["expired"].includes(normalized)) return "expired";
  return "active";
}

function buildExternalReference(userId: number, plan: SubscriptionPlan): string {
  return `nota10:user:${userId}:plan:${plan}`;
}

function parseExternalReference(
  value: string | undefined,
): { userId: number; plan: SubscriptionPlan } | null {
  if (!value) return null;
  const match = /^nota10:user:(\d+):plan:(free|pro|pro_enem)$/.exec(value);
  if (!match) return null;

  const userId = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  return {
    userId,
    plan: match[2] as SubscriptionPlan,
  };
}

export async function createMercadoPagoWebSubscription(input: {
  userId: number;
  userEmail: string | null;
  plan: BillingCatalogPlan;
  backUrl: string;
}): Promise<{ checkoutUrl: string; providerSubscriptionId: string }> {
  assertMercadoPagoEnabled();

  const endpoint = "https://api.mercadopago.com/preapproval";
  const payload = {
    reason: `Nota10 ${input.plan.displayName}`,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: input.plan.monthlyPriceCents / 100,
      currency_id: input.plan.currency,
    },
    external_reference: buildExternalReference(input.userId, input.plan.id),
    payer_email: input.userEmail ?? undefined,
    back_url: input.backUrl,
    status: "pending",
    ...(ENV.mercadoPagoWebhookUrl
      ? {
          notification_url: ENV.mercadoPagoWebhookUrl,
        }
      : {}),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`MERCADOPAGO_CREATE_SUBSCRIPTION_FAILED_${response.status}:${raw}`);
  }

  const data = JSON.parse(raw) as MercadoPagoPreapprovalResponse;
  const checkoutUrl = data.init_point || data.sandbox_init_point;
  if (!checkoutUrl) {
    throw new Error("MERCADOPAGO_CHECKOUT_URL_MISSING");
  }

  return {
    checkoutUrl,
    providerSubscriptionId: data.id,
  };
}

export async function fetchMercadoPagoPreapproval(preapprovalId: string) {
  assertMercadoPagoEnabled();
  const endpoint = `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ENV.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
    },
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`MERCADOPAGO_FETCH_PREAPPROVAL_FAILED_${response.status}:${raw}`);
  }

  const data = JSON.parse(raw) as MercadoPagoPreapprovalResponse;
  const ref = parseExternalReference(data.external_reference);

  return {
    providerSubscriptionId: data.id,
    status: mapMercadoPagoStatus(data.status),
    plan: ref?.plan ?? "free",
    userId: ref?.userId ?? null,
    expiresAt: data.next_payment_date ? new Date(data.next_payment_date) : null,
    raw: data,
  };
}

export function verifyMercadoPagoWebhookSignature(input: {
  authorizationHeader: string | undefined;
}): boolean {
  if (!ENV.mercadoPagoWebhookSecret) {
    return !ENV.isProduction;
  }

  const token = input.authorizationHeader?.trim();
  if (!token) return false;
  return token === `Bearer ${ENV.mercadoPagoWebhookSecret}` || token === ENV.mercadoPagoWebhookSecret;
}
