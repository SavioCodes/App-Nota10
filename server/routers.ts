import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { artifactsRouter } from "./routers/artifacts.router";
import { authRouter } from "./routers/auth.router";
import { chunksRouter } from "./routers/chunks.router";
import { documentsRouter } from "./routers/documents.router";
import { foldersRouter } from "./routers/folders.router";
import { reviewRouter } from "./routers/review.router";
import { usageRouter } from "./routers/usage.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  folders: foldersRouter,
  documents: documentsRouter,
  chunks: chunksRouter,
  artifacts: artifactsRouter,
  review: reviewRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
