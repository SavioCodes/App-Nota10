import { describe, expect, it } from "vitest";

import { selectChunksByIds } from "../features/results/chunks";

const chunks = [
  { id: 1, chunkOrder: 0, textContent: "A" },
  { id: 2, chunkOrder: 1, textContent: "B" },
  { id: 3, chunkOrder: 2, textContent: "C" },
];

describe("selectChunksByIds", () => {
  it("returns chunks in the same order of requested ids", () => {
    const selected = selectChunksByIds([3, 1], chunks);
    expect(selected.map((item) => item.id)).toEqual([3, 1]);
  });

  it("ignores duplicate, invalid, and missing ids", () => {
    const selected = selectChunksByIds([2, 2, -1, 999, 1], chunks);
    expect(selected.map((item) => item.id)).toEqual([2, 1]);
  });

  it("returns empty list when input is empty", () => {
    expect(selectChunksByIds([], chunks)).toEqual([]);
    expect(selectChunksByIds([1, 2], [])).toEqual([]);
  });
});
