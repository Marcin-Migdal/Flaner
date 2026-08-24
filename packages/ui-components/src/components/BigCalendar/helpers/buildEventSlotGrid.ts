import { endOfDay, isBefore, startOfDay } from "date-fns";

import { CalendarEvent } from "../types";

/**
 * Represents what occupies a single slot on a given day.
 * - `event`: the CalendarEvent placed here
 * - `null`: empty placeholder (keeps slot alignment consistent)
 */
export type SlotEntry<T = unknown> = { event: CalendarEvent<T> } | null;

/**
 * A map from day‑key ("YYYY-MM-DD") → ordered array of SlotEntries.
 * Index = slot row. If an event spans Mon-Wed, it will appear at the
 * same index on all three days.
 */
export type EventSlotGrid<T = unknown> = Map<string, SlotEntry<T>[]>;

/** Canonical key used in the grid map */
export const dayKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Build a slot grid for `days` (the full calendar grid, usually 35 or 42 days).
 *
 * Algorithm:
 * 1. Sort events: longer (multi-day) first, then by start date.
 * 2. For each event, determine which grid-days it covers.
 * 3. Find the **lowest slot index** that is free on **all** of those days.
 * 4. Reserve that slot on every covered day.
 *
 * This guarantees a multi-day event occupies the same visual row on every day.
 */
export function buildEventSlotGrid<T = unknown>(days: Date[], events: CalendarEvent<T>[] | undefined): EventSlotGrid<T> {
  const grid: EventSlotGrid<T> = new Map();

  // Initialise every day with an empty slots array
  for (const d of days) {
    grid.set(dayKey(d), []);
  }

  if (!events || events.length === 0) {return grid;}

  // Build a set of valid day-keys for fast lookup
  const validDays = new Set(days.map(dayKey));

  // Sort: longer events first (so they "reserve" their lane early),
  // ties broken by earlier start.
  const sorted = [...events].sort((a, b) => {
    const aDuration = endOfDay(a.end).getTime() - startOfDay(a.start).getTime();
    const bDuration = endOfDay(b.end).getTime() - startOfDay(b.start).getTime();
    if (bDuration !== aDuration) {return bDuration - aDuration;} // longer first
    return a.start.getTime() - b.start.getTime(); // earlier first
  });

  for (const event of sorted) {
    // Collect all day-keys this event spans that are inside the grid
    const coveredKeys: string[] = [];
    const cursor = new Date(startOfDay(event.start));
    const eventEnd = endOfDay(event.end);

    while (!isBefore(eventEnd, cursor)) {
      const k = dayKey(cursor);
      if (validDays.has(k)) {
        coveredKeys.push(k);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (coveredKeys.length === 0) {continue;}

    // Find the first slot index that is free on ALL covered days
    let slotIndex = 0;
     
    while (true) {
      const isFree = coveredKeys.every((k) => {
        const slots = grid.get(k);
        if (!slots) return true;
        return slotIndex >= slots.length || slots[slotIndex] === null;
      });
      if (isFree) {break;}
      slotIndex++;
    }

    // Reserve the slot on every covered day (fill gaps with null)
    for (const k of coveredKeys) {
      const slots = grid.get(k);
      if (slots) {
        while (slots.length <= slotIndex) {
          slots.push(null);
        }
        slots[slotIndex] = { event };
      }
    }
  }

  return grid;
}
