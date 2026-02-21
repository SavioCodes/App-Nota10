import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const foldersRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getUserFolders(ctx.user.id)),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(({ ctx, input }) => db.createFolder({ userId: ctx.user.id, name: input.name })),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => db.deleteFolder(input.id, ctx.user.id)),
});
