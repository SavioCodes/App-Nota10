import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  type ArtifactRecord,
  toContentMap,
  toFlashcardContent,
  toQuestionContent,
  toSourceIds,
  toSummaryContent,
} from "@/features/artifacts/parsers";

type ModeKey = "faithful" | "deepened" | "exam";

type ChunkRecord = {
  id: number;
  chunkOrder: number;
  textContent: string;
};

export function useResultsData(params: { docId: number; activeMode: ModeKey }) {
  const artifactsQuery = trpc.artifacts.list.useQuery(
    { documentId: params.docId, mode: params.activeMode },
    {
      enabled: params.docId > 0,
      staleTime: 0,
    },
  );
  const chunksQuery = trpc.chunks.list.useQuery(
    { documentId: params.docId },
    {
      enabled: params.docId > 0,
    },
  );

  const artifacts = useMemo(
    () => (artifactsQuery.data ?? []) as ArtifactRecord[],
    [artifactsQuery.data],
  );
  const chunks = (chunksQuery.data ?? []) as ChunkRecord[];

  const summary = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "summary")
        .map((artifact) => ({
          artifact,
          content: toSummaryContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );
  const contentMap = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "content_map")
        .map((artifact) => ({
          artifact,
          content: toContentMap(artifact.content),
        }))
        .find((entry) => entry.content !== null),
    [artifacts],
  );
  const flashcards = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "flashcard")
        .map((artifact) => ({
          artifact,
          content: toFlashcardContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );
  const questions = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "question")
        .map((artifact) => ({
          artifact,
          content: toQuestionContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );

  const getChunkText = (chunkIds: number[]) => {
    if (chunkIds.length === 0) return [];
    return chunks.filter((chunk) => chunkIds.includes(chunk.id));
  };

  return {
    artifactsQuery,
    chunksQuery,
    artifacts,
    chunks,
    summary,
    contentMap,
    flashcards,
    questions,
    getChunkText,
  };
}
