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

  it("breaks tie between events of equal duration by earlier start date", () => {
    const eventLater: CalendarEvent = {
      id: "ev-later",
      title: "Later",
      start: d2,
      end: d2,
    };
    const eventEarlier: CalendarEvent = {
      id: "ev-earlier",
      title: "Earlier",
      start: d1,
      end: d1,
    };

    const grid = buildEventSlotGrid(days, [eventLater, eventEarlier]);
    expect(grid.get("2026-05-01")?.[0]?.event.id).toBe("ev-earlier");
    expect(grid.get("2026-05-02")?.[0]?.event.id).toBe("ev-later");
  });

  it("skips events completely outside the grid and handles undefined events", () => {
    const outOfRangeEvent: CalendarEvent = {
      id: "ev-out",
      title: "Outside",
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 2),
    };

    const grid = buildEventSlotGrid(days, [outOfRangeEvent]);
    expect(grid.get("2026-05-01")).toEqual([]);

    const emptyGrid = buildEventSlotGrid(days, undefined);
    expect(emptyGrid.size).toBe(3);
  });

  it("handles slot gap filling with null and reusing empty slot", () => {
    // Event A: d1 to d2 (slot 0 on d1, d2)
    const eventA: CalendarEvent = {
      id: "ev-a",
      title: "Event A",
      start: d1,
      end: d2,
    };
    // Event B: d2 to d3 (duration 2). Since slot 0 on d2 is taken, B takes slot 1 on d2 and d3.
    // This creates a gap (null) at slot 0 on d3!
    const eventB: CalendarEvent = {
      id: "ev-b",
      title: "Event B",
      start: d2,
      end: d3,
    };
    // Event C: d3 only (duration 1). Should reuse the null gap at slot 0 on d3!
    const eventC: CalendarEvent = {
      id: "ev-c",
      title: "Event C",
      start: d3,
      end: d3,
    };

    const grid = buildEventSlotGrid(days, [eventA, eventB, eventC]);
    expect(grid.get("2026-05-03")?.[0]?.event.id).toBe("ev-c");
    expect(grid.get("2026-05-03")?.[1]?.event.id).toBe("ev-b");
  });
});
