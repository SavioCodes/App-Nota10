import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getTodayIsoDate } from "../services/usage-limits.service";

export const usageRouter = router({
  today: protectedProcedure.query(async ({ ctx }) => {
    const usage = await db.getDailyUsage(ctx.user.id, getTodayIsoDate());
    const plan = await db.getEffectivePlan(ctx.user.id);
    return {
      conversionsUsed: usage.conversionCount,
      conversionsLimit: plan === "free" ? 3 : -1,
      plan,
    };
  }),
});
