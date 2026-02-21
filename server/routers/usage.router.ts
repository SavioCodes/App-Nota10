import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getEffectiveEntitlement } from "../services/entitlement.service";
import { getTodayIsoDate } from "../services/usage-limits.service";

export const usageRouter = router({
  today: protectedProcedure.query(async ({ ctx }) => {
    const usage = await db.getDailyUsage(ctx.user.id, getTodayIsoDate());
    const entitlement = await getEffectiveEntitlement(ctx.user.id);

    return {
      conversionsUsed: usage.conversionCount,
      conversionsLimit: entitlement.plan === "free" ? 3 : -1,
      plan: entitlement.plan,
      entitlementProvider: entitlement.provider,
      entitlementExpiresAt: entitlement.expiresAt,
    };
  }),
});
