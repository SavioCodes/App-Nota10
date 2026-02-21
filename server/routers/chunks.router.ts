import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const chunksRouter = router({
  list: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(({ ctx, input }) => db.getDocumentChunks(input.documentId, ctx.user.id)),
});
