/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => {
  return {
    getUserFolders: vi.fn(async () => []),
    createFolder: vi.fn(async () => 1),
    deleteFolder: vi.fn(async () => {}),
    getFolderDocuments: vi.fn(async () => []),
    getUserDocuments: vi.fn(async () => []),
    getDocument: vi.fn(async () => ({ id: 1, userId: 77, textHash: "hash-1", status: "ready" })),
    getFolder: vi.fn(async () => ({ id: 12, userId: 77 })),
    createDocument: vi.fn(async () => 99),
    updateDocumentStatus: vi.fn(async () => {}),
    getDocumentChunks: vi.fn(async () => [{ id: 1, textContent: "chunk 1" }]),
    deleteDocumentChunks: vi.fn(async () => {}),
    createChunks: vi.fn(async () => {}),
    getDocumentArtifacts: vi.fn(async () => []),
    createArtifacts: vi.fn(async () => {}),
    getUserReviewItems: vi.fn(async () => []),
    getAllUserReviewItems: vi.fn(async () => []),
    getReviewItem: vi.fn(async () => ({
      id: 55,
      userId: 77,
      artifactId: 2,
      documentId: 1,
      nextReviewAt: new Date(),
      easeFactor: 2.5,
      interval: 1,
      streak: 0,
      createdAt: new Date(),
    })),
    updateReviewItem: vi.fn(async () => {}),
    syncReviewItemsForDocument: vi.fn(async () => ({ seededCount: 0, validFlashcards: 0 })),
    createReviewItems: vi.fn(async () => 0),
    getDailyUsage: vi.fn(async () => ({ conversionCount: 0 })),
    incrementDailyUsage: vi.fn(async () => {}),
    getEffectivePlan: vi.fn(async () => "free"),
    getUserByOpenId: vi.fn(async () => undefined),
    upsertRevenueCatSubscription: vi.fn(async () => {}),
    syncUserPlanFromSubscriptions: vi.fn(async () => "free"),
    markRevenueCatWebhookEventProcessed: vi.fn(async () => true),
  };
});

vi.mock("../server/services/artifact-generation.service", () => {
  return {
    generateArtifactsForDocument: vi.fn(async () => ({ cached: false, count: 0 })),
    processDocument: vi.fn(async () => {}),
  };
});

vi.mock("../server/services/review-sync.service", () => {
  return {
    initReviewForDocument: vi.fn(async () => ({ count: 0, availableFlashcards: 0 })),
  };
});

vi.mock("../server/services/usage-limits.service", () => {
  return {
    assertConversionAllowed: vi.fn(async () => "free"),
    assertUserRateLimit: vi.fn(() => {}),
    getTodayIsoDate: vi.fn(() => "2026-02-21"),
  };
});

vi.mock("../server/storage", () => {
  return {
    storagePut: vi.fn(async () => ({ key: "k", url: "https://example.com/file.pdf" })),
  };
});

vi.mock("../server/_core/extraction", () => {
  return {
    assertUploadMimeType: vi.fn(() => {}),
    assertUploadSize: vi.fn(() => {}),
  };
});

import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as artifactService from "../server/services/artifact-generation.service";
import * as reviewSyncService from "../server/services/review-sync.service";

function createContext(): TrpcContext {
  return {
    user: {
      id: 77,
      openId: "owner-user",
      supabaseUserId: null,
      authProvider: null,
      email: "owner@example.com",
      name: "Owner",
      loginMethod: "oauth",
      role: "user",
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("ownership routing guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards userId in documents.list with folder filter", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.documents.list({ folderId: 12 });

    expect(mockedDb.getFolderDocuments).toHaveBeenCalledWith(12, 77);
  });

  it("forwards userId in documents.get", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.documents.get({ id: 44 });

    expect(mockedDb.getDocument).toHaveBeenCalledWith(44, 77);
  });

  it("forwards userId in chunks.list", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.chunks.list({ documentId: 5 });

    expect(mockedDb.getDocumentChunks).toHaveBeenCalledWith(5, 77);
  });

  it("forwards userId in artifacts.list and applies source hash from owned document", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.artifacts.list({ documentId: 5 });

    expect(mockedDb.getDocument).toHaveBeenCalledWith(5, 77);
    expect(mockedDb.getDocumentArtifacts).toHaveBeenCalledWith(5, undefined, undefined, "hash-1", 77);
  });

  it("forwards userId in artifacts.generate service invocation", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedService = artifactService as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.artifacts.generate({ documentId: 5, mode: "faithful" });

    expect(mockedService.generateArtifactsForDocument).toHaveBeenCalledWith({
      documentId: 5,
      mode: "faithful",
      userId: 77,
      consumeUsage: true,
    });
  });

  it("forwards userId when answering review item", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.review.answer({ reviewItemId: 55, quality: 4 });

    expect(mockedDb.getReviewItem).toHaveBeenCalledWith(55, 77);
    expect(mockedDb.updateReviewItem).toHaveBeenCalled();
    expect(mockedDb.updateReviewItem.mock.calls[0]?.[2]).toBe(77);
  });

  it("forwards userId in review.initForDocument service invocation", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedReviewSync = reviewSyncService as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.review.initForDocument({ documentId: 10 });

    expect(mockedReviewSync.initReviewForDocument).toHaveBeenCalledWith({ userId: 77, documentId: 10 });
  });

  it("enforces folder ownership context in documents.upload path", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;
    const mockedService = artifactService as unknown as Record<string, ReturnType<typeof vi.fn>>;

    await caller.documents.upload({
      folderId: 12,
      title: "Doc",
      fileBase64: Buffer.from("file-content").toString("base64"),
      fileName: "doc.pdf",
      mimeType: "application/pdf",
    });

    expect(mockedDb.getFolder).toHaveBeenCalledWith(12, 77);
    expect(mockedDb.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: 12,
        userId: 77,
      }),
    );
    expect(mockedService.processDocument).toHaveBeenCalledWith(
      99,
      "application/pdf",
      expect.any(String),
      77,
    );
  });
});
