import { createHash } from "node:crypto";

export type ChunkingOptions = {
  targetSize?: number;
  minSize?: number;
  maxSize?: number;
  overlap?: number;
};

export type DeterministicChunk = {
  chunkOrder: number;
  textContent: string;
  startOffset: number;
  endOffset: number;
};

const DEFAULT_CHUNK_OPTIONS: Required<ChunkingOptions> = {
  targetSize: 760,
  minSize: 600,
  maxSize: 900,
  overlap: 120,
};

const BREAKPOINT_PATTERNS = [/\n\n/g, /\n/g, /[.!?;:](?=\s)/g, /,(?=\s)/g, /\s+/g];

function normalizeChunkOptions(options?: ChunkingOptions): Required<ChunkingOptions> {
  const merged = {
    ...DEFAULT_CHUNK_OPTIONS,
    ...options,
  };

  const minSize = Math.max(200, Math.min(merged.minSize, merged.maxSize - 50));
  const maxSize = Math.max(minSize + 50, merged.maxSize);
  const targetSize = Math.min(maxSize, Math.max(minSize, merged.targetSize));
  const overlap = Math.max(0, Math.min(200, merged.overlap));

  return {
    targetSize,
    minSize,
    maxSize,
    overlap,
  };
}

export function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trim();
}

export function computeTextHash(text: string): string {
  return createHash("sha256").update(normalizeExtractedText(text), "utf8").digest("hex");
}

function findBestBreakpoint(text: string, lowerBound: number, upperBound: number): number | null {
  if (lowerBound >= upperBound) return null;

  const segment = text.slice(lowerBound, upperBound);
  if (!segment) return null;

  for (const pattern of BREAKPOINT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let candidate: RegExpExecArray | null = null;

    while ((match = pattern.exec(segment)) !== null) {
      candidate = match;
    }

    if (candidate) {
      const endOffset = candidate.index + candidate[0].length;
      return lowerBound + endOffset;
    }
  }

  return null;
}

function trimChunkBoundaries(text: string, start: number, end: number): { start: number; end: number } {
  let trimmedStart = start;
  let trimmedEnd = end;

  while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart] ?? "")) trimmedStart += 1;
  while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1] ?? "")) trimmedEnd -= 1;

  return { start: trimmedStart, end: trimmedEnd };
}

export function chunkTextDeterministic(rawText: string, options?: ChunkingOptions): DeterministicChunk[] {
  const text = normalizeExtractedText(rawText);
  if (!text) return [];

  const { minSize, maxSize, overlap } = normalizeChunkOptions(options);

  const chunks: DeterministicChunk[] = [];
  let cursor = 0;
  let guard = 0;

  while (cursor < text.length) {
    guard += 1;
    if (guard > 10000) {
      throw new Error("Chunking aborted due to excessive iterations");
    }

    const windowEnd = Math.min(text.length, cursor + maxSize);
    const windowStart = Math.min(windowEnd, cursor + minSize);

    let end = windowEnd;
    if (windowStart < windowEnd) {
      const breakpoint = findBestBreakpoint(text, windowStart, windowEnd);
      if (breakpoint && breakpoint > cursor) {
        end = breakpoint;
      }
    }

    const { start, end: trimmedEnd } = trimChunkBoundaries(text, cursor, end);
    if (trimmedEnd <= start) {
      cursor = Math.max(end, cursor + 1);
      continue;
    }

    chunks.push({
      chunkOrder: chunks.length,
      textContent: text.slice(start, trimmedEnd),
      startOffset: start,
      endOffset: trimmedEnd,
    });

    if (trimmedEnd >= text.length) {
      break;
    }

    const nextCursor = Math.max(trimmedEnd - overlap, cursor + 1);
    cursor = nextCursor;
  }

  return chunks;
}
