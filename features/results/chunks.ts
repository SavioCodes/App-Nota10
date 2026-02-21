type ChunkLike = {
  id: number;
};

export function selectChunksByIds<TChunk extends ChunkLike>(
  chunkIds: number[],
  chunks: TChunk[],
): TChunk[] {
  if (chunkIds.length === 0 || chunks.length === 0) return [];

  const chunkById = new Map<number, TChunk>();
  for (const chunk of chunks) {
    if (!chunkById.has(chunk.id)) {
      chunkById.set(chunk.id, chunk);
    }
  }

  const selected: TChunk[] = [];
  const seenIds = new Set<number>();

  for (const chunkId of chunkIds) {
    if (!Number.isInteger(chunkId) || chunkId <= 0 || seenIds.has(chunkId)) {
      continue;
    }
    const chunk = chunkById.get(chunkId);
    if (!chunk) continue;
    selected.push(chunk);
    seenIds.add(chunkId);
  }

  return selected;
}
