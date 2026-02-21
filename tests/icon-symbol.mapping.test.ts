import { describe, expect, it } from "vitest";

import { ICON_SYMBOL_MAPPING } from "../components/ui/icon-symbol.mapping";

describe("ICON_SYMBOL_MAPPING", () => {
  it("includes cross-platform symbols used by key screens", () => {
    expect(ICON_SYMBOL_MAPPING["xmark"]).toBeTruthy();
    expect(ICON_SYMBOL_MAPPING["chevron.down"]).toBeTruthy();
    expect(ICON_SYMBOL_MAPPING["checkmark"]).toBeTruthy();
    expect(ICON_SYMBOL_MAPPING["map.fill"]).toBeTruthy();
  });

  it("does not map any symbol to an empty material icon name", () => {
    const mappedValues = Object.values(ICON_SYMBOL_MAPPING);
    expect(mappedValues.every((value) => typeof value === "string" && value.trim().length > 0)).toBe(true);
  });
});
