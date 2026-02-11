import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  artifacts,
  chunks,
  documents,
  folders,
  InsertDocument,
  InsertFolder,
  InsertSubscription,
  InsertUser,
  reviewItems,
  subscriptions,
  usageCounters,
  users,
} from "../drizzle/schema";
import type { SubscriptionPlan } from "../shared/revenuecat";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function getFolderDocuments(folderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.folderId, folderId)).orderBy(desc(documents.createdAt));
}

export async function getUserDocuments(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  if (limit) return q.limit(limit);
  return q;
}

export async function getDocument(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
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
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (extractedText !== undefined) updateData.extractedText = extractedText;
  if (ocrConfidence !== undefined) updateData.ocrConfidence = ocrConfidence;
  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function getDocumentChunks(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chunks).where(eq(chunks.documentId, documentId)).orderBy(chunks.chunkOrder);
}

export async function createChunks(documentId: number, textChunks: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (textChunks.length === 0) return;
  const values = textChunks.map((text, i) => ({
    documentId,
    chunkOrder: i,
    textContent: text,
  }));
  await db.insert(chunks).values(values);
}

export async function getDocumentArtifacts(documentId: number, type?: string, mode?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(artifacts.documentId, documentId)];
  if (type) conditions.push(eq(artifacts.type, type as any));
  if (mode) conditions.push(eq(artifacts.mode, mode as any));
  return db.select().from(artifacts).where(and(...conditions));
}

export async function createArtifacts(data: Array<{
  documentId: number;
  type: "summary" | "content_map" | "flashcard" | "question";
  content: any;
  sourceChunkIds: number[];
  mode: "faithful" | "deepened" | "exam";
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(artifacts).values(data);
}

export async function getUserReviewItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(reviewItems).where(and(eq(reviewItems.userId, userId), lte(reviewItems.nextReviewAt, now)));
}

export async function getAllUserReviewItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewItems).where(eq(reviewItems.userId, userId));
}

export async function createReviewItems(data: Array<{
  userId: number;
  artifactId: number;
  documentId: number;
  nextReviewAt: Date;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(reviewItems).values(data);
}

export async function updateReviewItem(
  id: number,
  data: {
    nextReviewAt: Date;
    easeFactor: number;
    interval: number;
    streak: number;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviewItems).set(data).where(eq(reviewItems.id, id));
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
