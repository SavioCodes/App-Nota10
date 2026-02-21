import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { initReviewForDocument } from "../services/review-sync.service";

export const reviewRouter = router({
  today: protectedProcedure.query(({ ctx }) => db.getUserReviewItems(ctx.user.id)),
  all: protectedProcedure.query(({ ctx }) => db.getAllUserReviewItems(ctx.user.id)),
  answer: protectedProcedure
    .input(z.object({ reviewItemId: z.number(), quality: z.number().min(0).max(5) }))
    .mutation(async ({ ctx, input }) => {
      const { reviewItemId, quality } = input;
      const reviewItem = await db.getReviewItem(reviewItemId, ctx.user.id);
      if (!reviewItem) {
        throw new Error("REVIEW_ITEM_NOT_FOUND");
      }

      let easeFactor = reviewItem.easeFactor;
      let interval = reviewItem.interval;
      let streak = reviewItem.streak;

      // SM-2 scheduling tuned for daily student repetition.
      if (quality >= 3) {
        streak += 1;
        if (streak === 1) interval = 1;
        else if (streak === 2) interval = 6;
        else interval = Math.max(1, Math.round(interval * easeFactor));
        easeFactor = Math.max(
          1.3,
          easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
        );
      } else {
        streak = 0;
        interval = 1;
      }

      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + interval);
      await db.updateReviewItem(reviewItemId, { nextReviewAt, easeFactor, interval, streak }, ctx.user.id);
      return { nextReviewAt, interval, streak };
    }),
  initForDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(({ ctx, input }) =>
      initReviewForDocument({ userId: ctx.user.id, documentId: input.documentId }),
    ),
});
