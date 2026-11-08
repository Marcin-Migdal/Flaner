import { describe, expect, it } from "vitest";
import { getRandomSlotColor } from "./utils";
import { SLOT_COLOR_KEYS, isSlotColorKey } from "../../utils/slotColors";

describe("EventModal utils - getRandomSlotColor", () => {
  const baseStart = new Date("2026-06-01T10:00:00Z");
  const baseEnd = new Date("2026-06-01T12:00:00Z");

  it("returns a palette colour key when there are no existing dates", () => {
    const color = getRandomSlotColor(baseStart, baseEnd, []);
    expect(isSlotColorKey(color)).toBe(true);
  });

  it("filters out colors of close existing slots within 7 days", () => {
    const closeStart = new Date("2026-06-03T10:00:00Z");
    const closeEnd = new Date("2026-06-03T12:00:00Z");

    const color = getRandomSlotColor(baseStart, baseEnd, [
      { start: closeStart, end: closeEnd, color: "blue" },
    ]);
    expect(color).not.toBe("blue");
  });

  it("does not filter colors of slots farther than 7 days away", () => {
    const distantStart = new Date("2026-06-20T10:00:00Z");
    const distantEnd = new Date("2026-06-20T12:00:00Z");

    const color = getRandomSlotColor(baseStart, baseEnd, [
      { start: distantStart, end: distantEnd, color: "blue" },
    ]);
    expect(isSlotColorKey(color)).toBe(true);
  });

  it("filters out colors of slots within 7 days of newSlotEnd when newSlotStart is far away", () => {
    const longRangeStart = new Date("2026-06-01T10:00:00Z");
    const longRangeEnd = new Date("2026-06-25T10:00:00Z");
    const nearEndSlotStart = new Date("2026-06-23T10:00:00Z");
    const nearEndSlotEnd = new Date("2026-06-24T10:00:00Z");

    const color = getRandomSlotColor(longRangeStart, longRangeEnd, [
      { start: nearEndSlotStart, end: nearEndSlotEnd, color: "blue" },
    ]);
    expect(color).not.toBe("blue");
  });

  it("falls back to the full palette if all colors are occupied by close slots", () => {
    const allColors = SLOT_COLOR_KEYS;

    const closeSlots = allColors.map((color) => ({
      start: baseStart,
      end: baseEnd,
      color,
    }));

    const color = getRandomSlotColor(baseStart, baseEnd, closeSlots);
    expect(allColors).toContain(color);
  });
});
