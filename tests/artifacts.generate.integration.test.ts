/* eslint-disable import/first */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  artifacts: [] as any[],
}));

vi.mock("../server/db", () => {
  const getDocumentArtifacts = vi.fn(
    async (documentId: number, type?: string, mode?: string, sourceHash?: string) =>
      state.artifacts.filter((artifact) => {
        if (artifact.documentId !== documentId) return false;
        if (type && artifact.type !== type) return false;
        if (mode && artifact.mode !== mode) return false;
        if (sourceHash && artifact.sourceHash !== sourceHash) return false;
        return true;
      }),
  );

  const createArtifacts = vi.fn(async (rows: any[]) => {
    state.artifacts.push(
      ...rows.map((row, index) => ({
        id: state.artifacts.length + index + 1,
        createdAt: new Date(),
        ...row,
      })),
    );
  });

  return {
    getDocument: vi.fn(async (id: number) => ({
      id,
      userId: 1,
      textHash: "hash-abc",
      title: "Doc",
      folderId: 1,
      originalFileUrl: "https://example.com/doc.pdf",
      extractedText: "texto",
      ocrConfidence: "high",
      status: "ready",
      createdAt: new Date(),
    })),
    getDocumentChunks: vi.fn(async () => [
      { id: 11, documentId: 1, chunkOrder: 0, textContent: "Chunk 11", startOffset: 0, endOffset: 8 },
      { id: 12, documentId: 1, chunkOrder: 1, textContent: "Chunk 12", startOffset: 9, endOffset: 17 },
    ]),
    getDocumentArtifacts,
    createArtifacts,
    getEffectivePlan: vi.fn(async () => "free"),
    getDailyUsage: vi.fn(async () => ({ conversionCount: 0 })),
    incrementDailyUsage: vi.fn(async () => {}),
    getUserFolders: vi.fn(async () => []),
    createFolder: vi.fn(async () => 1),
    deleteFolder: vi.fn(async () => {}),
    getFolderDocuments: vi.fn(async () => []),
    getUserDocuments: vi.fn(async () => []),
    createDocument: vi.fn(async () => 1),
    updateDocumentStatus: vi.fn(async () => {}),
    deleteDocumentChunks: vi.fn(async () => {}),
    createChunks: vi.fn(async () => {}),
    getUserReviewItems: vi.fn(async () => []),
    getAllUserReviewItems: vi.fn(async () => []),
    updateReviewItem: vi.fn(async () => {}),
    createReviewItems: vi.fn(async () => {}),
    getUserByOpenId: vi.fn(async () => undefined),
    upsertRevenueCatSubscription: vi.fn(async () => {}),
    syncUserPlanFromSubscriptions: vi.fn(async () => "free"),
  };
});

import type { TrpcContext } from "../server/_core/context";
import { resetLlmAdapter, setLlmAdapter } from "../server/_core/llm";
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
    req: { headers: {} } as any,
    res: {} as any,
  };
}

describe("artifacts.generate integration", () => {
  beforeEach(() => {
    state.artifacts = [];
    vi.clearAllMocks();

    setLlmAdapter({
      invoke: async (params) => {
        const json =
          params.profile === "strict"
            ? {
                summary: [{ text: "Resumo validado", sourceChunkIds: [11], section: "FIEL" }],
                map: {
                  title: "Mapa",
                  topics: [{ title: "Topico", subtopics: ["Sub"], sourceChunkIds: [12], section: "FIEL" }],
                },
                flashcards: [
                  {
                    front: "Frente",
                    back: "Verso",
                    difficultyTag: "definition",
                    sourceChunkIds: [11],
                    section: "FIEL",
                  },
                ],
                questions: [
                  {
                    type: "multiple_choice",
                    prompt: "Pergunta",
                    options: ["A", "B", "C", "D"],
                    answerKey: "A",
                    rationaleShort: "Justificativa",
                    sourceChunkIds: [12],
                    section: "FIEL",
                  },
                ],
              }
            : {
                summary: [{ text: "Resumo rascunho", sourceChunkIds: [11], section: "FIEL" }],
                map: {
                  title: "Mapa",
                  topics: [{ title: "Topico", subtopics: ["Sub"], sourceChunkIds: [12], section: "FIEL" }],
                },
                flashcards: [
                  {
                    front: "Frente",
                    back: "Verso",
                    difficultyTag: "definition",
                    sourceChunkIds: [11],
                    section: "FIEL",
                  },
                ],
                questions: [
                  {
                    type: "multiple_choice",
                    prompt: "Pergunta",
                    options: ["A", "B", "C", "D"],
                    answerKey: "A",
                    rationaleShort: "Justificativa",
                    sourceChunkIds: [12],
                    section: "FIEL",
                  },
                ],
              };

        return {
          id: "mock-id",
          created: Date.now(),
          model: "mock-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: JSON.stringify(json) },
              finish_reason: "stop",
            },
          ],
        };
      },
    });
  });

  it("uses cache and avoids second generation for the same source hash", async () => {
    const caller = appRouter.createCaller(createContext());
    const mockedDb = db as unknown as Record<string, any>;

    const first = await caller.artifacts.generate({ documentId: 1, mode: "faithful" });
    const second = await caller.artifacts.generate({ documentId: 1, mode: "faithful" });

    expect(first.cached).toBe(false);
    expect(first.count).toBeGreaterThan(0);
    expect(second.cached).toBe(true);
    expect(second.count).toBe(first.count);

    expect(mockedDb.createArtifacts).toHaveBeenCalledTimes(1);
    expect(mockedDb.incrementDailyUsage).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => {
  resetLlmAdapter();
});
