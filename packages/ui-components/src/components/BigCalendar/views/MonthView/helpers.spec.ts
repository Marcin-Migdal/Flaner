import { describe, it, expect } from "vitest";
import { isBetween, getCellClass } from "./helpers";

describe("MonthView helpers", () => {
  describe("isBetween", () => {
    it("returns true if day is within interval", () => {
      const d1 = new Date(2026, 4, 1);
      const d2 = new Date(2026, 4, 5);
      const target = new Date(2026, 4, 3);

      expect(isBetween(target, d1, d2)).toBe(true);
      expect(isBetween(target, d2, d1)).toBe(true); // reversed order
    });

    it("returns false if day is outside interval", () => {
      const d1 = new Date(2026, 4, 1);
      const d2 = new Date(2026, 4, 5);
      const target = new Date(2026, 4, 10);

      expect(isBetween(target, d1, d2)).toBe(false);
    });
  });

  describe("getCellClass", () => {
    const baseDate = new Date(2026, 4, 15);

    it("applies outside month and disabled classes", () => {
      const outsideMonthDate = new Date(2026, 3, 30);
      const classes = getCellClass({
        day: outsideMonthDate,
        index: 0,
        currentDate: baseDate,
        days: [outsideMonthDate],
        hasEvents: false,
        hoverDate: null,
        isDisabled: true,
      });

      expect(classes).toContain("opacity-25 bg-muted/60");
      expect(classes).toContain("opacity-40 bg-muted/40 cursor-not-allowed");
    });

    it("applies single selection classes when selected", () => {
      const classes = getCellClass({
        day: baseDate,
        index: 0,
        currentDate: baseDate,
        days: [baseDate],
        selectionMode: "single",
        selectedDate: baseDate,
        hasEvents: false,
        hoverDate: null,
      });

      expect(classes).toContain("bg-brand text-brand-foreground");
    });

    it("applies range selection classes for start, end, and in-between dates", () => {
      const start = new Date(2026, 4, 10);
      const mid = new Date(2026, 4, 12);
      const end = new Date(2026, 4, 15);

      const startClasses = getCellClass({
        day: start,
        index: 0,
        currentDate: baseDate,
        days: [start, mid, end],
        selectionMode: "range",
        selectedDate: [start, end],
        hasEvents: false,
        hoverDate: null,
      });
      expect(startClasses).toContain("bg-brand text-brand-foreground");

      const midClasses = getCellClass({
        day: mid,
        index: 1,
        currentDate: baseDate,
        days: [start, mid, end],
        selectionMode: "range",
        selectedDate: [start, end],
        hasEvents: false,
        hoverDate: null,
      });
      expect(midClasses).toContain("bg-brand/15");
    });

    it("applies range hovering classes when only rangeStart is selected", () => {
      const start = new Date(2026, 4, 10);
      const mid = new Date(2026, 4, 12);
      const hover = new Date(2026, 4, 14);

      // Hover date itself
      const hoverClasses = getCellClass({
        day: hover,
        index: 2,
        currentDate: baseDate,
        days: [start, mid, hover],
        selectionMode: "range",
        selectedDate: [start, undefined],
        hasEvents: false,
        hoverDate: hover,
      });
      expect(hoverClasses).toContain("bg-brand/70 text-brand-foreground");

      // Mid date between start and hover
      const midClasses = getCellClass({
        day: mid,
        index: 1,
        currentDate: baseDate,
        days: [start, mid, hover],
        selectionMode: "range",
        selectedDate: [start, undefined],
        hasEvents: false,
        hoverDate: hover,
      });
      expect(midClasses).toContain("bg-brand/15");
    });

    it("handles no selectionMode", () => {
      const classes = getCellClass({
        day: baseDate,
        index: 0,
        currentDate: baseDate,
        days: [baseDate],
        selectionMode: undefined,
        hasEvents: false,
        hoverDate: null,
      });

      expect(classes).not.toContain("cursor-pointer");
    });

    it("applies today and single unselected classes", () => {
      const today = new Date();
      const otherDay = new Date(2026, 4, 20);

      const classesToday = getCellClass({
        day: today,
        index: 0,
        currentDate: today,
        days: [today],
        selectionMode: "single",
        selectedDate: otherDay,
        hasEvents: false,
        hoverDate: null,
      });

      expect(classesToday).toContain("bg-brand/5 ring-1");
      expect(classesToday).toContain("hover:bg-accent/50");
    });
  });
});
