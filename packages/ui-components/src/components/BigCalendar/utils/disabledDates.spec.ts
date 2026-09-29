import { describe, it, expect } from "vitest";
import { isDateDisabled } from "./disabledDates";

describe("isDateDisabled utility", () => {
  const targetDate = new Date(2026, 4, 15); // May 15, 2026 (Friday)

  it("returns false when config is undefined", () => {
    expect(isDateDisabled(targetDate)).toBe(false);
  });

  it("evaluates custom function config", () => {
    expect(isDateDisabled(targetDate, (d) => d.getDate() === 15)).toBe(true);
    expect(isDateDisabled(targetDate, (d) => d.getDate() === 20)).toBe(false);
  });

  it("evaluates before and after limits", () => {
    const beforeDate = new Date(2026, 4, 10);
    const afterDate = new Date(2026, 4, 20);

    // Before limit: date < before
    expect(isDateDisabled(new Date(2026, 4, 5), { before: beforeDate })).toBe(true);
    expect(isDateDisabled(new Date(2026, 4, 12), { before: beforeDate })).toBe(false);

    // After limit: date > after
    expect(isDateDisabled(new Date(2026, 4, 25), { after: afterDate })).toBe(true);
    expect(isDateDisabled(new Date(2026, 4, 15), { after: afterDate })).toBe(false);
  });

  it("evaluates daysOfWeek, specific dates array, and matcher", () => {
    // 5 is Friday
    expect(isDateDisabled(targetDate, { daysOfWeek: [5] })).toBe(true);
    expect(isDateDisabled(targetDate, { daysOfWeek: [0, 6] })).toBe(false);

    // dates array
    expect(isDateDisabled(targetDate, { dates: [new Date(2026, 4, 15)] })).toBe(true);
    expect(isDateDisabled(targetDate, { dates: [new Date(2026, 4, 16)] })).toBe(false);

    // matcher
    expect(isDateDisabled(targetDate, { matcher: (d) => d.getFullYear() === 2026 })).toBe(true);
  });

  it("evaluates today flag", () => {
    const today = new Date();
    expect(isDateDisabled(today, { today: true })).toBe(true);
    expect(isDateDisabled(new Date(2000, 1, 1), { today: true })).toBe(false);
  });
});
