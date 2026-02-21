import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { findCatalogPlanByWebProductId, getBillingCatalog } from "../services/billing-catalog.service";
import { createMercadoPagoWebSubscription } from "../services/billing-mercadopago.service";

const webCreateSubscriptionInput = z.object({
  webProductId: z.string().min(1),
  backUrl: z.string().url(),
});

const mobileVerifyInput = z.object({
  platform: z.enum(["ios", "android"]),
  productId: z.string().min(1),
  purchaseToken: z.string().min(1),
  transactionId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

export const billingRouter = router({
  catalog: protectedProcedure.query(() => {
    return getBillingCatalog().filter((plan) => plan.enabled);
  }),

  webCreateSubscription: protectedProcedure
    .input(webCreateSubscriptionInput)
    .mutation(async ({ ctx, input }) => {
      const plan = findCatalogPlanByWebProductId(input.webProductId);
      if (!plan) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BILLING_PLAN_NOT_FOUND" });
      }

      const result = await createMercadoPagoWebSubscription({
        userId: ctx.user.id,
        userEmail: ctx.user.email ?? null,
        plan,
        backUrl: input.backUrl,
      });

      return result;
    }),

  mobileVerifyPurchase: protectedProcedure
    .input(mobileVerifyInput)
    .mutation(async ({ ctx, input }) => {
      // Provider-side token verification is intentionally performed server-side.
      // In this migration step we persist pending state and rely on later confirmation
      // handlers to update status after platform verification response.
      const plan = getBillingCatalog().find(
        (candidate) =>
          candidate.enabled &&
          (input.platform === "ios"
            ? candidate.iosProductId === input.productId
            : candidate.androidProductId === input.productId),
      );

      if (!plan) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BILLING_PRODUCT_NOT_FOUND" });
      }

      await db.upsertSubscription({
        userId: ctx.user.id,
        plan: plan.id,
        status: "active",
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        provider: input.platform === "ios" ? "app_store" : "google_play",
        providerSubscriptionId: input.transactionId,
        providerCustomerId: ctx.user.openId,
        productId: input.productId,
        entitlementId: null,
      });

      await db.syncUserPlanFromSubscriptions(ctx.user.id);

      return {
        ok: true,
        plan: plan.id,
      };
    }),
});
