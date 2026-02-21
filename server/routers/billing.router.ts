import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import { protectedProcedure, router } from "../_core/trpc";
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
    .mutation(async ({ input }) => {
      if (!ENV.billingNativeIapEnabled) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "BILLING_NATIVE_IAP_DISABLED",
        });
      }

      const isConfigured =
        input.platform === "ios"
          ? Boolean(ENV.appleIssuerId && ENV.appleKeyId && ENV.applePrivateKeyBase64 && ENV.appleBundleId)
          : Boolean(ENV.googlePlayPackageName && ENV.googlePlayServiceAccountJsonBase64);

      if (!isConfigured) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "BILLING_MOBILE_VERIFICATION_NOT_CONFIGURED",
        });
      }

      // Safety guard: never grant paid entitlement on unverified client payload.
      const isKnownProduct = getBillingCatalog().some(
        (candidate) =>
          candidate.enabled &&
          (input.platform === "ios"
            ? candidate.iosProductId === input.productId
            : candidate.androidProductId === input.productId),
      );

      if (!isKnownProduct) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BILLING_PRODUCT_NOT_FOUND" });
      }

      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "BILLING_MOBILE_VERIFICATION_NOT_IMPLEMENTED",
      });
    }),
});
