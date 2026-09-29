import { describe, it, expect } from "vitest";
import { buildEventSlotGrid, dayKey } from "./buildEventSlotGrid";
import type { CalendarEvent } from "../types";

describe("buildEventSlotGrid helper", () => {
  const d1 = new Date(2026, 4, 1);
  const d2 = new Date(2026, 4, 2);
  const d3 = new Date(2026, 4, 3);
  const days = [d1, d2, d3];

  it("formats dayKey as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 4, 1))).toBe("2026-05-01");
  });

  it("returns initialized empty map when events is empty", () => {
    const grid = buildEventSlotGrid(days, []);
    expect(grid.size).toBe(3);
    expect(grid.get("2026-05-01")).toEqual([]);
  });

  it("assigns single event to slot 0", () => {
    const event: CalendarEvent = {
      id: "ev-1",
      title: "Meeting",
      start: d1,
      end: d1,
    };

    const grid = buildEventSlotGrid(days, [event]);
    const day1Slots = grid.get("2026-05-01");

    expect(day1Slots).toHaveLength(1);
    expect(day1Slots?.[0]?.event.id).toBe("ev-1");
  });

  it("assigns overlapping events to consecutive slot indices", () => {
    const eventA: CalendarEvent = {
      id: "ev-a",
      title: "Conference",
      start: d1,
      end: d3, // multi-day
    };
    const eventB: CalendarEvent = {
      id: "ev-b",
      title: "Call",
      start: d2,
      end: d2, // single day on day 2
    };

    const grid = buildEventSlotGrid(days, [eventA, eventB]);

    // Multi-day event should take slot 0 on all 3 days
    expect(grid.get("2026-05-01")?.[0]?.event.id).toBe("ev-a");
    expect(grid.get("2026-05-02")?.[0]?.event.id).toBe("ev-a");
    expect(grid.get("2026-05-03")?.[0]?.event.id).toBe("ev-a");

    // Single day event should take slot 1 on day 2
    expect(grid.get("2026-05-02")?.[1]?.event.id).toBe("ev-b");
  });
});
