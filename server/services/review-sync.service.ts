import * as db from "../db";

export async function initReviewForDocument(params: { userId: number; documentId: number }) {
  const document = await db.getDocument(params.documentId, params.userId);
  if (!document) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  const flashcards = await db.getDocumentArtifacts(
    params.documentId,
    "flashcard",
    undefined,
    document?.textHash ?? undefined,
    params.userId,
  );
  const seeded = await db.syncReviewItemsForDocument({
    userId: params.userId,
    documentId: params.documentId,
    sourceHash: document?.textHash,
  });
  return { count: seeded.seededCount, availableFlashcards: flashcards.length };
}
