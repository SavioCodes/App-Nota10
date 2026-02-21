/* eslint-disable import/first */

import { describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => {
  return {
    getDocument: vi.fn(async () => ({ id: 1, textHash: "hash", userId: 1 })),
    getDocumentArtifacts: vi.fn(async () => [{ id: 10 }, { id: 11 }]),
    syncReviewItemsForDocument: vi.fn(async () => ({ seededCount: 2, validFlashcards: 2 })),
  };
});

import { initReviewForDocument } from "../server/services/review-sync.service";

describe("review-sync service", () => {
  it("returns seeded count and available flashcards", async () => {
    const result = await initReviewForDocument({ userId: 1, documentId: 1 });
    expect(result).toEqual({ count: 2, availableFlashcards: 2 });
  });
});
