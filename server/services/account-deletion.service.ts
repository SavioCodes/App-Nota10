import { eq, inArray } from "drizzle-orm";

import {
  artifacts,
  chunks,
  documents,
  folders,
  reviewItems,
  subscriptions,
  usageCounters,
  users,
} from "../../drizzle/schema";
import { serverLogger } from "../_core/logger";
import { getDb } from "../db";
import { storageDelete } from "../storage";

export async function deleteUserAccountWithData(userId: number): Promise<{ deleted: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = existingUser[0];
  if (!user) {
    return { deleted: false };
  }

  const userDocuments = await db
    .select({ id: documents.id, originalFileKey: documents.originalFileKey })
    .from(documents)
    .where(eq(documents.userId, userId));

  // Try storage cleanup first. If remote delete fails, we still proceed with DB deletion
  // to honor account deletion requests.
  for (const doc of userDocuments) {
    if (!doc.originalFileKey) continue;
    try {
      await storageDelete(doc.originalFileKey);
    } catch (error) {
      serverLogger.warn("account.storage_delete_failed", {
        userId,
        documentId: doc.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const documentIds = userDocuments.map((doc) => doc.id);

  await db.transaction(async (tx) => {
    await tx.delete(reviewItems).where(eq(reviewItems.userId, userId));

    if (documentIds.length > 0) {
      await tx.delete(artifacts).where(inArray(artifacts.documentId, documentIds));
      await tx.delete(chunks).where(inArray(chunks.documentId, documentIds));
    }

    await tx.delete(documents).where(eq(documents.userId, userId));
    await tx.delete(folders).where(eq(folders.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(usageCounters).where(eq(usageCounters.userId, userId));

    await tx.delete(users).where(eq(users.id, userId));
  });

  return { deleted: true };
}
