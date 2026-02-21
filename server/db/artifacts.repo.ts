import { and, eq } from "drizzle-orm";
import { artifacts, documents } from "../../drizzle/schema";
import { getDb } from "./core";

type ArtifactType = typeof artifacts.$inferSelect.type;
type ArtifactMode = typeof artifacts.$inferSelect.mode;

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
