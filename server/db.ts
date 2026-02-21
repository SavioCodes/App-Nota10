import { and, asc, desc, eq, gt, inArray, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  artifacts,
  chunks,
  documents,
  folders,
  InsertDocument,
  InsertFolder,
  InsertSubscription,
  InsertRevenueCatWebhookEvent,
  InsertUser,
  revenueCatWebhookEvents,
  reviewItems,
  subscriptions,
  usageCounters,
  users,
} from "../drizzle/schema";
import type { SubscriptionPlan } from "../shared/revenuecat";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "trialing"]),
        or(isNull(subscriptions.expiresAt), gt(subscriptions.expiresAt, now)),
      ),
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);

  return rows[0];
}

export async function getEffectivePlan(
  userId: number,
  fallbackPlan: SubscriptionPlan = "free",
): Promise<SubscriptionPlan> {
  const db = await getDb();
  if (!db) return fallbackPlan;

  const active = await getActiveSubscriptionByUserId(userId);
  if (!active) return "free";

  return active.plan;
}

export async function upsertRevenueCatSubscription(data: {
  userId: number;
  plan: SubscriptionPlan;
  status: "active" | "trialing" | "billing_issue" | "canceled" | "expired";
  expiresAt?: Date | null;
  revenueCatId: string;
  productId?: string | null;
  entitlementId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertSubscription = {
    userId: data.userId,
    plan: data.plan,
    status: data.status,
    expiresAt: data.expiresAt ?? null,
    revenueCatId: data.revenueCatId,
    productId: data.productId ?? null,
    entitlementId: data.entitlementId ?? null,
  };

  await db.insert(subscriptions).values(values).onDuplicateKeyUpdate({
    set: {
      userId: data.userId,
      plan: data.plan,
      status: data.status,
      expiresAt: data.expiresAt ?? null,
      productId: data.productId ?? null,
      entitlementId: data.entitlementId ?? null,
      updatedAt: new Date(),
    },
  });
}

export async function markRevenueCatWebhookEventProcessed(data: {
  eventId: string;
  appUserId?: string | null;
  eventType?: string | null;
  eventTimestampMs?: number | null;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertRevenueCatWebhookEvent = {
    eventId: data.eventId,
    appUserId: data.appUserId ?? null,
    eventType: data.eventType ?? null,
    eventTimestampMs: data.eventTimestampMs ?? null,
  };

  try {
    await db.insert(revenueCatWebhookEvents).values(values);
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      return false;
    }
    throw error;
  }
}

export async function syncUserPlanFromSubscriptions(userId: number): Promise<SubscriptionPlan> {
  const db = await getDb();
  if (!db) return "free";

  const activeSubscription = await getActiveSubscriptionByUserId(userId);
  const plan = activeSubscription?.plan ?? "free";

  await db
    .update(users)
    .set({
      subscriptionPlan: plan,
      subscriptionExpiresAt: activeSubscription?.expiresAt ?? null,
    })
    .where(eq(users.id, userId));

  return plan;
}

export async function getUserFolders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(desc(folders.createdAt));
}

export async function createFolder(data: InsertFolder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(folders).values(data).$returningId();
  return result.id;
}

export async function deleteFolder(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
}

export async function getFolderDocuments(folderId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (typeof userId === "number") {
    return db
      .select()
      .from(documents)
      .where(and(eq(documents.folderId, folderId), eq(documents.userId, userId)))
      .orderBy(desc(documents.createdAt));
  }
  return db.select().from(documents).where(eq(documents.folderId, folderId)).orderBy(desc(documents.createdAt));
}

export async function getUserDocuments(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  if (limit) return q.limit(limit);
  return q;
}

export async function getDocument(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const whereClause =
    typeof userId === "number"
      ? and(eq(documents.id, id), eq(documents.userId, userId))
      : eq(documents.id, id);
  const result = await db.select().from(documents).where(whereClause).limit(1);
  return result[0];
}

export async function getFolder(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const whereClause =
    typeof userId === "number"
      ? and(eq(folders.id, id), eq(folders.userId, userId))
      : eq(folders.id, id);
  const result = await db.select().from(folders).where(whereClause).limit(1);
  return result[0];
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(documents).values(data).$returningId();
  return result.id;
}

export async function updateDocumentStatus(
  id: number,
  status: string,
  extractedText?: string,
  ocrConfidence?: string,
  textHash?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (extractedText !== undefined) updateData.extractedText = extractedText;
  if (ocrConfidence !== undefined) updateData.ocrConfidence = ocrConfidence;
  if (textHash !== undefined) updateData.textHash = textHash;
  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function getDocumentChunks(documentId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (typeof userId === "number") {
    return db
      .select({
        id: chunks.id,
        documentId: chunks.documentId,
        chunkOrder: chunks.chunkOrder,
        textContent: chunks.textContent,
        startOffset: chunks.startOffset,
        endOffset: chunks.endOffset,
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(and(eq(chunks.documentId, documentId), eq(documents.userId, userId)))
      .orderBy(chunks.chunkOrder);
  }
  return db.select().from(chunks).where(eq(chunks.documentId, documentId)).orderBy(chunks.chunkOrder);
}

export async function deleteDocumentChunks(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(chunks).where(eq(chunks.documentId, documentId));
}

export async function createChunks(
  documentId: number,
  inputChunks: string[] | { chunkOrder: number; textContent: string; startOffset: number; endOffset: number }[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (inputChunks.length === 0) return;

  const isStringChunks = typeof inputChunks[0] === "string";
  const values = isStringChunks
    ? (inputChunks as string[]).map((text, i) => ({
        documentId,
        chunkOrder: i,
        textContent: text,
        startOffset: 0,
        endOffset: text.length,
      }))
    : (
        inputChunks as {
          chunkOrder: number;
          textContent: string;
          startOffset: number;
          endOffset: number;
        }[]
      ).map(
        (chunk) => ({
          documentId,
          chunkOrder: chunk.chunkOrder,
          textContent: chunk.textContent,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        }),
      );

  await db.insert(chunks).values(values);
}

export async function getDocumentArtifacts(
  documentId: number,
  type?: ArtifactType,
  mode?: ArtifactMode,
  sourceHash?: string,
  userId?: number,
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(artifacts.documentId, documentId)];
  if (type) conditions.push(eq(artifacts.type, type));
  if (mode) conditions.push(eq(artifacts.mode, mode));
  if (sourceHash) conditions.push(eq(artifacts.sourceHash, sourceHash));

  if (typeof userId === "number") {
    return db
      .select({
        id: artifacts.id,
        documentId: artifacts.documentId,
        type: artifacts.type,
        content: artifacts.content,
        sourceChunkIds: artifacts.sourceChunkIds,
        sourceHash: artifacts.sourceHash,
        mode: artifacts.mode,
        createdAt: artifacts.createdAt,
      })
      .from(artifacts)
      .innerJoin(documents, eq(artifacts.documentId, documents.id))
      .where(and(...conditions, eq(documents.userId, userId)));
  }

  return db.select().from(artifacts).where(and(...conditions));
}

export async function createArtifacts(data: {
  documentId: number;
  type: ArtifactType;
  content: unknown;
  sourceChunkIds: number[];
  mode: ArtifactMode;
  sourceHash?: string | null;
}[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(artifacts).values(data);
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

export async function getDailyUsage(userId: number, date: string) {
  const db = await getDb();
  if (!db) return { conversionCount: 0 };
  const result = await db
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.userId, userId), eq(usageCounters.date, date)))
    .limit(1);
  return result[0] || { conversionCount: 0 };
}

export async function incrementDailyUsage(userId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(usageCounters)
    .values({ userId, date, conversionCount: 1 })
    .onDuplicateKeyUpdate({ set: { conversionCount: sql`${usageCounters.conversionCount} + 1` } });
}
