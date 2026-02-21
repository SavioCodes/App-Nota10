/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => {
  return {
    getEffectivePlan: vi.fn(async () => "free"),
    getDailyUsage: vi.fn(async () => ({ conversionCount: 0 })),
    incrementDailyUsage: vi.fn(async () => {}),
    getDocument: vi.fn(async () => ({ id: 1, userId: 1, textHash: "hash", status: "ready" })),
    getDocumentChunks: vi.fn(async () => []),
    getDocumentArtifacts: vi.fn(async () => []),
    createArtifacts: vi.fn(async () => {}),
    syncReviewItemsForDocument: vi.fn(async () => ({ seededCount: 0, validFlashcards: 0 })),
    getUserFolders: vi.fn(async () => []),
    createFolder: vi.fn(async () => 1),
    deleteFolder: vi.fn(async () => {}),
    getFolderDocuments: vi.fn(async () => []),
    getUserDocuments: vi.fn(async () => []),
    getFolder: vi.fn(async () => ({ id: 1, userId: 1 })),
    createDocument: vi.fn(async () => 1),
    updateDocumentStatus: vi.fn(async () => {}),
    deleteDocumentChunks: vi.fn(async () => {}),
    createChunks: vi.fn(async () => {}),
    getUserReviewItems: vi.fn(async () => [
      {
        id: 10,
        userId: 1,
        artifactId: 20,
        documentId: 30,
        nextReviewAt: new Date(),
        easeFactor: 2.5,
        interval: 1,
        streak: 0,
        createdAt: new Date(),
        artifactType: "flashcard",
        artifactMode: "faithful",
        artifactContent: { front: "Frente", back: "Verso" },
        artifactCreatedAt: new Date(),
        front: "Frente",
        back: "Verso",
      },
    ]),
    getAllUserReviewItems: vi.fn(async () => []),
    getReviewItem: vi.fn(async () => ({
      id: 10,
      userId: 1,
      artifactId: 20,
      documentId: 30,
      nextReviewAt: new Date(),
      easeFactor: 2.5,
      interval: 1,
      streak: 0,
      createdAt: new Date(),
    })),
    updateReviewItem: vi.fn(async () => {}),
    createReviewItems: vi.fn(async () => 0),
    getUserByOpenId: vi.fn(async () => undefined),
    upsertRevenueCatSubscription: vi.fn(async () => {}),
    syncUserPlanFromSubscriptions: vi.fn(async () => "free"),
  };
});

import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

function createContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "user-open-id",
      email: "user@example.com",
      name: "User",
      loginMethod: "oauth",
      role: "user",
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("review router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns review queue with flashcard front/back", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.review.today();

    expect(result).toHaveLength(1);
    expect(result[0]?.front).toBe("Frente");
    expect(result[0]?.back).toBe("Verso");
  });

  it("updates SM-2 fields on review.answer", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    const result = await caller.review.answer({ reviewItemId: 10, quality: 4 });

    expect(result.interval).toBe(1);
    expect(result.streak).toBe(1);
    expect(mockedDb.updateReviewItem).toHaveBeenCalledTimes(1);
  });

  it("uses syncReviewItemsForDocument for idempotent seeding", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;
    mockedDb.syncReviewItemsForDocument.mockResolvedValueOnce({
      seededCount: 3,
      validFlashcards: 3,
    });

    const result = await caller.review.initForDocument({ documentId: 1 });

    expect(result.count).toBe(3);
    expect(result.availableFlashcards).toBe(0);
    expect(mockedDb.syncReviewItemsForDocument).toHaveBeenCalledTimes(1);
  });
});
