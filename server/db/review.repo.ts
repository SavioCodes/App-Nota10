import { and, asc, desc, eq, inArray, lte, notInArray } from "drizzle-orm";
import { artifacts, documents, reviewItems } from "../../drizzle/schema";
import { getDb } from "./core";

type ArtifactType = typeof artifacts.$inferSelect.type;
type ArtifactMode = typeof artifacts.$inferSelect.mode;

type FlashcardArtifactContent = {
  front?: unknown;
  back?: unknown;
  level?: unknown;
  difficultyTag?: unknown;
  section?: unknown;
  isComplement?: unknown;
  notFoundInMaterial?: unknown;
};

export type ReviewQueueItem = typeof reviewItems.$inferSelect & {
  artifactType: ArtifactType;
  artifactMode: ArtifactMode;
  artifactContent: unknown;
  artifactCreatedAt: Date;
  front: string | null;
  back: string | null;
};

function parseFlashcardContent(value: unknown): { front: string | null; back: string | null } {
  if (!value || typeof value !== "object") {
    return { front: null, back: null };
  }

  const content = value as FlashcardArtifactContent;
  const front = typeof content.front === "string" ? content.front : null;
  const back = typeof content.back === "string" ? content.back : null;
  return { front, back };
}

function toReviewQueueItems(
  rows: {
    id: number;
    userId: number;
    artifactId: number;
    documentId: number;
    nextReviewAt: Date;
    easeFactor: number;
    interval: number;
    streak: number;
    createdAt: Date;
    artifactType: ArtifactType;
    artifactMode: ArtifactMode;
    artifactContent: unknown;
    artifactCreatedAt: Date;
  }[],
): ReviewQueueItem[] {
  return rows.map((row) => {
    const flashcardContent = parseFlashcardContent(row.artifactContent);
    return {
      id: row.id,
      userId: row.userId,
      artifactId: row.artifactId,
      documentId: row.documentId,
      nextReviewAt: row.nextReviewAt,
      easeFactor: row.easeFactor,
      interval: row.interval,
      streak: row.streak,
      createdAt: row.createdAt,
      artifactType: row.artifactType,
      artifactMode: row.artifactMode,
      artifactContent: row.artifactContent,
      artifactCreatedAt: row.artifactCreatedAt,
      front: flashcardContent.front,
      back: flashcardContent.back,
    };
  });
}

export async function getUserReviewItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({
      id: reviewItems.id,
      userId: reviewItems.userId,
      artifactId: reviewItems.artifactId,
      documentId: reviewItems.documentId,
      nextReviewAt: reviewItems.nextReviewAt,
      easeFactor: reviewItems.easeFactor,
      interval: reviewItems.interval,
      streak: reviewItems.streak,
      createdAt: reviewItems.createdAt,
      artifactType: artifacts.type,
      artifactMode: artifacts.mode,
      artifactContent: artifacts.content,
      artifactCreatedAt: artifacts.createdAt,
    })
    .from(reviewItems)
    .innerJoin(artifacts, eq(reviewItems.artifactId, artifacts.id))
    .where(and(eq(reviewItems.userId, userId), lte(reviewItems.nextReviewAt, now)))
    .orderBy(asc(reviewItems.nextReviewAt), asc(reviewItems.id));
  return toReviewQueueItems(rows);
}

export async function getAllUserReviewItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: reviewItems.id,
      userId: reviewItems.userId,
      artifactId: reviewItems.artifactId,
      documentId: reviewItems.documentId,
      nextReviewAt: reviewItems.nextReviewAt,
      easeFactor: reviewItems.easeFactor,
      interval: reviewItems.interval,
      streak: reviewItems.streak,
      createdAt: reviewItems.createdAt,
      artifactType: artifacts.type,
      artifactMode: artifacts.mode,
      artifactContent: artifacts.content,
      artifactCreatedAt: artifacts.createdAt,
    })
    .from(reviewItems)
    .innerJoin(artifacts, eq(reviewItems.artifactId, artifacts.id))
    .where(eq(reviewItems.userId, userId))
    .orderBy(desc(reviewItems.nextReviewAt), desc(reviewItems.id));
  return toReviewQueueItems(rows);
}

export async function createReviewItems(data: {
  userId: number;
  artifactId: number;
  documentId: number;
  nextReviewAt: Date;
}[]): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return 0;

  const userId = data[0]?.userId;
  if (!userId) return 0;
  if (data.some((item) => item.userId !== userId)) {
    throw new Error("All review items in a single batch must belong to the same user");
  }

  const uniqueRowsByArtifact = new Map<number, (typeof data)[number]>();
  for (const row of data) {
    if (!uniqueRowsByArtifact.has(row.artifactId)) {
      uniqueRowsByArtifact.set(row.artifactId, row);
    }
  }

  const uniqueRows = Array.from(uniqueRowsByArtifact.values());
  const artifactIds = uniqueRows.map((row) => row.artifactId);
  if (artifactIds.length === 0) return 0;

  const existing = await db
    .select({ artifactId: reviewItems.artifactId })
    .from(reviewItems)
    .where(and(eq(reviewItems.userId, userId), inArray(reviewItems.artifactId, artifactIds)));
  const existingIds = new Set(existing.map((row) => row.artifactId));
  const toInsert = uniqueRows.filter((row) => !existingIds.has(row.artifactId));
  if (toInsert.length === 0) return 0;

  try {
    await db.insert(reviewItems).values(toInsert);
  } catch (error: unknown) {
    // Ignore duplicate races. The unique index guarantees idempotency.
    const code = (error as { code?: string })?.code;
    if (code !== "ER_DUP_ENTRY") {
      throw error;
    }
  }

  return toInsert.length;
}

export async function syncReviewItemsForDocument(input: {
  userId: number;
  documentId: number;
  sourceHash?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const artifactFilters = [
    eq(documents.userId, input.userId),
    eq(artifacts.documentId, input.documentId),
    eq(artifacts.type, "flashcard" as ArtifactType),
  ];
  if (input.sourceHash) {
    artifactFilters.push(eq(artifacts.sourceHash, input.sourceHash));
  }

  const flashcards = await db
    .select({ artifactId: artifacts.id })
    .from(artifacts)
    .innerJoin(documents, eq(artifacts.documentId, documents.id))
    .where(and(...artifactFilters));

  const validArtifactIds = flashcards.map((row) => row.artifactId);

  if (validArtifactIds.length === 0) {
    await db
      .delete(reviewItems)
      .where(and(eq(reviewItems.userId, input.userId), eq(reviewItems.documentId, input.documentId)));
    return { seededCount: 0, validFlashcards: 0 };
  }

  await db
    .delete(reviewItems)
    .where(
      and(
        eq(reviewItems.userId, input.userId),
        eq(reviewItems.documentId, input.documentId),
        notInArray(reviewItems.artifactId, validArtifactIds),
      ),
    );

  const now = new Date();
  const seededCount = await createReviewItems(
    validArtifactIds.map((artifactId) => ({
      userId: input.userId,
      artifactId,
      documentId: input.documentId,
      nextReviewAt: now,
    })),
  );

  return { seededCount, validFlashcards: validArtifactIds.length };
}

export async function updateReviewItem(
  id: number,
  data: {
    nextReviewAt: Date;
    easeFactor: number;
    interval: number;
    streak: number;
  },
  userId?: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const whereClause =
    typeof userId === "number"
      ? and(eq(reviewItems.id, id), eq(reviewItems.userId, userId))
      : eq(reviewItems.id, id);
  await db.update(reviewItems).set(data).where(whereClause);
}

export async function getReviewItem(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const whereClause =
    typeof userId === "number"
      ? and(eq(reviewItems.id, id), eq(reviewItems.userId, userId))
      : eq(reviewItems.id, id);
  const result = await db.select().from(reviewItems).where(whereClause).limit(1);
  return result[0];
}
