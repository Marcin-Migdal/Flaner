import { describe, expect, it } from "vitest";
import { getRandomSlotColor } from "./utils";

describe("EventModal utils - getRandomSlotColor", () => {
  const baseStart = new Date("2026-06-01T10:00:00Z");
  const baseEnd = new Date("2026-06-01T12:00:00Z");

  it("returns a valid color hex when there are no existing dates", () => {
    const color = getRandomSlotColor(baseStart, baseEnd, []);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("filters out colors of close existing slots within 7 days", () => {
    const closeStart = new Date("2026-06-03T10:00:00Z");
    const closeEnd = new Date("2026-06-03T12:00:00Z");

    const color = getRandomSlotColor(baseStart, baseEnd, [
      { start: closeStart, end: closeEnd, color: "#3b82f6" },
    ]);
    expect(color).not.toBe("#3b82f6");
  });

  it("does not filter colors of slots farther than 7 days away", () => {
    const distantStart = new Date("2026-06-20T10:00:00Z");
    const distantEnd = new Date("2026-06-20T12:00:00Z");

    const color = getRandomSlotColor(baseStart, baseEnd, [
      { start: distantStart, end: distantEnd, color: "#3b82f6" },
    ]);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("filters out colors of slots within 7 days of newSlotEnd when newSlotStart is far away", () => {
    const longRangeStart = new Date("2026-06-01T10:00:00Z");
    const longRangeEnd = new Date("2026-06-25T10:00:00Z");
    const nearEndSlotStart = new Date("2026-06-23T10:00:00Z");
    const nearEndSlotEnd = new Date("2026-06-24T10:00:00Z");

    const color = getRandomSlotColor(longRangeStart, longRangeEnd, [
      { start: nearEndSlotStart, end: nearEndSlotEnd, color: "#3b82f6" },
    ]);
    expect(color).not.toBe("#3b82f6");
  });

  it("falls back to the full palette if all colors are occupied by close slots", () => {
    const allColors = [
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      "#06b6d4",
      "#0ea5e9",
      "#0d9488",
      "#64748b",
    ];

    const closeSlots = allColors.map((color) => ({
      start: baseStart,
      end: baseEnd,
      color,
    }));

    const color = getRandomSlotColor(baseStart, baseEnd, closeSlots);
    expect(allColors).toContain(color);
  });
});
