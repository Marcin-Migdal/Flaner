import type { RepeatEnd, RepeatPattern, RepeatRule } from "../../api/budget";
import { endOfNextMonth, nextOccurrence, occurrencesBetween, resolveRepeatEnd } from "./repeatRules";

const never: RepeatEnd = { type: "never" };

describe("repeatRules", () => {
  it("repeats weekly on the chosen weekdays, from the start day on", () => {
    // 2026-11-04 is a Wednesday
    const rule: RepeatRule = { pattern: { frequency: "weekly", interval: 1, weekdays: [1, 3, 5] }, start: "2026-11-04", end: never };

    expect(occurrencesBetween(rule, "2026-11-01", "2026-11-15")).toEqual([
      "2026-11-04",
      "2026-11-06",
      "2026-11-09",
      "2026-11-11",
      "2026-11-13",
    ]);
  });

  it("repeats every N weeks, counted from the start's week", () => {
    const rule: RepeatRule = { pattern: { frequency: "weekly", interval: 2, weekdays: [2] }, start: "2026-11-03", end: never };

    expect(occurrencesBetween(rule, "2026-11-01", "2026-12-06")).toEqual(["2026-11-03", "2026-11-17", "2026-12-01"]);
  });

  it("clamps monthly days 29–31 to the last day of shorter months", () => {
    const rule: RepeatRule = { pattern: { frequency: "monthly", interval: 1, day: 31 }, start: "2026-01-31", end: never };

    expect(occurrencesBetween(rule, "2026-01-01", "2026-05-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("repeats on the last day of the month", () => {
    const rule: RepeatRule = { pattern: { frequency: "monthly", interval: 1, day: "last" }, start: "2028-01-15", end: never };

    expect(occurrencesBetween(rule, "2028-01-01", "2028-03-31")).toEqual(["2028-01-31", "2028-02-29", "2028-03-31"]);
  });

  it("repeats every N months and skips a day before the start", () => {
    const rule: RepeatRule = { pattern: { frequency: "monthly", interval: 3, day: 10 }, start: "2026-01-20", end: never };

    expect(occurrencesBetween(rule, "2026-01-01", "2026-12-31")).toEqual(["2026-04-10", "2026-07-10", "2026-10-10"]);
  });

  it("moves a yearly 29 February to 28 February outside leap years", () => {
    const rule: RepeatRule = { pattern: { frequency: "yearly", interval: 1, month: 2, day: 29 }, start: "2028-02-29", end: never };

    expect(occurrencesBetween(rule, "2028-01-01", "2032-12-31")).toEqual([
      "2028-02-29",
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
    ]);
  });

  it("stops at an until date", () => {
    const rule: RepeatRule = {
      pattern: { frequency: "monthly", interval: 1, day: 5 },
      start: "2026-01-05",
      end: { type: "until", date: "2026-03-05" },
    };

    expect(occurrencesBetween(rule, "2026-01-01", "2026-12-31")).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
    expect(nextOccurrence(rule, "2026-03-06")).toBeNull();
  });

  it("stores 'after N times' as the date of the Nth occurrence", () => {
    const pattern: RepeatPattern = { frequency: "weekly", interval: 1, weekdays: [1, 4] };
    const end = resolveRepeatEnd(pattern, "2026-11-02", { type: "after", count: 3 });

    expect(end).toEqual({ type: "after", count: 3, date: "2026-11-09" });
    const rule: RepeatRule = { pattern, start: "2026-11-02", end };
    expect(occurrencesBetween(rule, "2026-11-01", "2026-12-31")).toEqual(["2026-11-02", "2026-11-05", "2026-11-09"]);
  });

  it("finds the next occurrence on or after a day", () => {
    const rule: RepeatRule = { pattern: { frequency: "monthly", interval: 1, day: 15 }, start: "2026-01-15", end: never };

    expect(nextOccurrence(rule, "2026-11-15")).toBe("2026-11-15");
    expect(nextOccurrence(rule, "2026-11-16")).toBe("2026-12-15");
  });

  it("gives the last day of the next month", () => {
    expect(endOfNextMonth("2026-01-31")).toBe("2026-02-28");
    expect(endOfNextMonth("2026-12-01")).toBe("2027-01-31");
  });
});
