import { addDays, addMonths, addWeeks, format, getDaysInMonth, parseISO, startOfISOWeek } from "date-fns";
import type { RepeatEnd, RepeatEndInput, RepeatPattern, RepeatRule } from "../../api/budget";

/**
 * Repeat rules of recurring transactions: occurrences are computed from `start` with date-fns, never stored.
 * Dates are `YYYY-MM-DD` strings (local calendar days).
 */

const toDay = (date: Date) => format(date, "yyyy-MM-dd");

/** The day `day` of a month, clamped to its last day (31 → 30 April, 29 → 28 February outside leap years). */
const clampedDay = (year: number, monthIndex: number, day: number | "last") => {
  const last = getDaysInMonth(new Date(year, monthIndex, 1));
  return new Date(year, monthIndex, day === "last" ? last : Math.min(day, last));
};

/** Candidate days of the pattern in ascending order from `start`'s week / month / year, before the `start` filter. */
function* candidates(pattern: RepeatPattern, start: Date): Generator<Date> {
  const interval = Math.max(1, Math.floor(pattern.interval));
  if (pattern.frequency === "weekly") {
    const weekdays = [...new Set(pattern.weekdays)].sort((a, b) => a - b);
    if (weekdays.length === 0) return;
    for (let week = startOfISOWeek(start); ; week = addWeeks(week, interval)) {
      for (const weekday of weekdays) yield addDays(week, weekday - 1);
    }
  }
  if (pattern.frequency === "monthly") {
    for (let month = new Date(start.getFullYear(), start.getMonth(), 1); ; month = addMonths(month, interval)) {
      yield clampedDay(month.getFullYear(), month.getMonth(), pattern.day);
    }
  }
  for (let year = start.getFullYear(); ; year += interval) {
    yield clampedDay(year, pattern.month - 1, pattern.day);
  }
}

/** Every occurrence from `start` in ascending order, up to the rule's end (endless for `never`). */
export function* occurrences(rule: RepeatRule): Generator<string> {
  const start = parseISO(rule.start);
  const until = rule.end.type === "never" ? null : rule.end.date;
  for (const candidate of candidates(rule.pattern, start)) {
    if (candidate < start) continue;
    const day = toDay(candidate);
    if (until !== null && day > until) return;
    yield day;
  }
}

/** Occurrences between `from` and `to` (inclusive). */
export const occurrencesBetween = (rule: RepeatRule, from: string, to: string): string[] => {
  const days: string[] = [];
  for (const day of occurrences(rule)) {
    if (day > to) break;
    if (day >= from) days.push(day);
  }
  return days;
};

/** The first occurrence on or after `day`, or `null` once the rule has ended. */
export const nextOccurrence = (rule: RepeatRule, day: string): string | null => {
  for (const occurrence of occurrences(rule)) {
    if (occurrence >= day) return occurrence;
  }
  return null;
};

/** The date of the `count`th occurrence from `start` (how "end after N times" is stored). */
export const nthOccurrence = (pattern: RepeatPattern, start: string, count: number): string | null => {
  let seen = 0;
  for (const occurrence of occurrences({ pattern, start, end: { type: "never" } })) {
    seen += 1;
    if (seen >= count) return occurrence;
  }
  return null;
};

/** The end an editor's choice stores: "after N times" becomes the date of the Nth occurrence from `start`. */
export const resolveRepeatEnd = (
  pattern: RepeatPattern,
  start: string,
  end: RepeatEndInput,
): RepeatEnd => {
  if (end.type !== "after") return end;
  return { type: "after", count: end.count, date: nthOccurrence(pattern, start, end.count) ?? start };
};

/** Today as `YYYY-MM-DD`. */
export const todayDay = () => toDay(new Date());

/** A day `days` after (or before, negative) `day`. */
export const shiftDay = (day: string, days: number) => toDay(addDays(parseISO(day), days));

/** The last day of the month after `day`'s month (how far ahead existing transactions are matched). */
export const endOfNextMonth = (day: string) => {
  const next = addMonths(parseISO(day), 1);
  return toDay(new Date(next.getFullYear(), next.getMonth(), getDaysInMonth(next)));
};
