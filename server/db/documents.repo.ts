import { and, desc, eq } from "drizzle-orm";
import { chunks, documents, type InsertDocument } from "../../drizzle/schema";
import { getDb } from "./core";

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
