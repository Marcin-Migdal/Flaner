import { DEFAULT_SLOT_COLOR, SLOT_COLOR_KEYS, getSlotColorValue, isSlotColorKey } from "./slotColors";

describe("slotColors", () => {
  it("maps a key to its theme token", () => {
    expect(getSlotColorValue("teal")).toBe("var(--event-teal)");
  });

  it("falls back to the default colour for unknown or missing keys", () => {
    expect(getSlotColorValue("#3b82f6")).toBe(`var(--event-${DEFAULT_SLOT_COLOR})`);
    expect(getSlotColorValue(undefined)).toBe(`var(--event-${DEFAULT_SLOT_COLOR})`);
  });

  it("recognises only palette keys", () => {
    expect(SLOT_COLOR_KEYS.every(isSlotColorKey)).toBe(true);
    expect(isSlotColorKey("red")).toBe(false);
  });
});
