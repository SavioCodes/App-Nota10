import { and, desc, eq } from "drizzle-orm";
import { documents, folders, type InsertFolder } from "../../drizzle/schema";
import { getDb } from "./core";

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
