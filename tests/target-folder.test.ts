import { describe, expect, it } from "vitest";

import { resolveTargetFolderId } from "../lib/_core/target-folder";

const folders = [
  { id: 10, name: "Math" },
  { id: 20, name: "History" },
];

describe("resolveTargetFolderId", () => {
  it("returns null when folder list is empty", () => {
    expect(resolveTargetFolderId(null, [])).toBeNull();
    expect(resolveTargetFolderId(10, undefined)).toBeNull();
  });

  it("keeps selected folder when it exists in the list", () => {
    expect(resolveTargetFolderId(20, folders)).toBe(20);
  });

  it("falls back to first folder when selected id is stale", () => {
    expect(resolveTargetFolderId(999, folders)).toBe(10);
  });

  it("falls back to first folder when nothing is selected", () => {
    expect(resolveTargetFolderId(null, folders)).toBe(10);
  });
});
