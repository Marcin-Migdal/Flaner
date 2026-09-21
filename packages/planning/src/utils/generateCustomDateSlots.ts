import {
  parseISO,
  isWeekend,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDate,
  setDate,
  differenceInCalendarDays,
} from "date-fns";
import type { CustomSlotsConfig } from "../components/CustomDateSlotsPopover/CustomDateSlotsPopover";

export type GeneratedDateSlot = {
  start: Date;
  end: Date;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const generateCustomDateSlots = (config: CustomSlotsConfig): GeneratedDateSlot[] => {
  const start = startOfDay(parseISO(config.startDate));
  const end = startOfDay(parseISO(config.endDate));

  if (start > end) {
    return [];
  }

  const matchingDays: Date[] = [];
  const frequency = Math.max(1, config.frequency);

  if (config.unit === "day") {
    let current = new Date(start);
    while (current <= end) {
      if (!config.skipWeekends || !isWeekend(current)) {
        matchingDays.push(new Date(current));
      }
      current = addDays(current, frequency);
    }
  } else if (config.unit === "week") {
    // Determine the week of start (Monday-based)
    let currentWeekStart = startOfWeek(start, { weekStartsOn: 1 });

    while (currentWeekStart <= end) {
      // Check each of the 7 days in this week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayInWeek = addDays(currentWeekStart, dayOffset);
        const dayOfWeekIndex = getDay(dayInWeek); // 0 = Sun, 1 = Mon...

        if (config.selectedWeekDays.includes(dayOfWeekIndex)) {
          if (dayInWeek >= start && dayInWeek <= end) {
            matchingDays.push(new Date(dayInWeek));
          }
        }
      }
      currentWeekStart = addWeeks(currentWeekStart, frequency);
    }
  } else if (config.unit === "month") {
    let currentMonth = startOfMonth(start);

    while (currentMonth <= end) {
      if (config.monthSubMode === "each") {
        let targetDay: Date | null = null;
        if (config.selectedMonthDay === "last") {
          targetDay = endOfMonth(currentMonth);
        } else {
          const maxDayInMonth = getDate(endOfMonth(currentMonth));
          if (config.selectedMonthDay <= maxDayInMonth) {
            targetDay = setDate(currentMonth, config.selectedMonthDay);
          }
        }

        if (targetDay && targetDay >= start && targetDay <= end) {
          if (!config.skipWeekends || !isWeekend(targetDay)) {
            matchingDays.push(new Date(targetDay));
          }
        }
      } else if (config.monthSubMode === "onThe") {
        const targetWeekday = WEEKDAY_MAP[config.monthWeekday] ?? 0;
        const allDaysInMonth = eachDayOfInterval({
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth),
        });
        const weekdayMatches = allDaysInMonth.filter((d) => getDay(d) === targetWeekday);

        let targetDay: Date | undefined;
        if (config.monthOrdinal === "first") {
          targetDay = weekdayMatches[0];
        } else if (config.monthOrdinal === "second") {
          targetDay = weekdayMatches[1];
        } else if (config.monthOrdinal === "third") {
          targetDay = weekdayMatches[2];
        } else if (config.monthOrdinal === "fourth") {
          targetDay = weekdayMatches[3];
        } else if (config.monthOrdinal === "fifth") {
          targetDay = weekdayMatches[4];
        } else if (config.monthOrdinal === "last") {
          targetDay = weekdayMatches[weekdayMatches.length - 1];
        }

        if (targetDay && targetDay >= start && targetDay <= end) {
          matchingDays.push(new Date(targetDay));
        }
      } else if (config.monthSubMode === "workday") {
        const allDaysInMonth = eachDayOfInterval({
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth),
        });
        const workdays = allDaysInMonth.filter((d) => !isWeekend(d));

        let targetDay: Date | undefined;
        if (config.monthWorkdayType === "first") {
          targetDay = workdays[0];
        } else if (config.monthWorkdayType === "last") {
          targetDay = workdays[workdays.length - 1];
        }

        if (targetDay && targetDay >= start && targetDay <= end) {
          matchingDays.push(new Date(targetDay));
        }
      }

      currentMonth = addMonths(currentMonth, frequency);
    }
  }

  if (matchingDays.length === 0) {
    return [];
  }

  // Sort chronologically and deduplicate individual days
  matchingDays.sort((a, b) => a.getTime() - b.getTime());
  const uniqueDays: Date[] = [];
  for (const day of matchingDays) {
    if (uniqueDays.length === 0 || differenceInCalendarDays(day, uniqueDays[uniqueDays.length - 1]) !== 0) {
      uniqueDays.push(day);
    }
  }

  if (!config.createAsRange) {
    return uniqueDays.map((d) => ({ start: startOfDay(d), end: startOfDay(d) }));
  }

  // Merge consecutive days into continuous slots
  const ranges: GeneratedDateSlot[] = [];
  let rangeStart = uniqueDays[0];
  let rangeEnd = uniqueDays[0];

  for (let i = 1; i < uniqueDays.length; i++) {
    const current = uniqueDays[i];
    if (differenceInCalendarDays(current, rangeEnd) === 1) {
      rangeEnd = current;
    } else {
      ranges.push({ start: startOfDay(rangeStart), end: startOfDay(rangeEnd) });
      rangeStart = current;
      rangeEnd = current;
    }
  }

  ranges.push({ start: startOfDay(rangeStart), end: startOfDay(rangeEnd) });
  return ranges;
};
