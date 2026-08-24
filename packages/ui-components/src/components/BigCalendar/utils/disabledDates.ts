import { isSameDay, isToday, startOfDay } from "date-fns";
import type { DisabledDatesProp } from "../types";

export function isDateDisabled(date: Date, config?: DisabledDatesProp): boolean {
  if (!config) return false;

  if (typeof config === "function") {
    return config(date);
  }

  const { today, before, after, dates, daysOfWeek, matcher } = config;
  const targetDay = startOfDay(date);

  if (today && isToday(date)) {
    return true;
  }

  if (before && targetDay < startOfDay(before)) {
    return true;
  }

  if (after && targetDay > startOfDay(after)) {
    return true;
  }

  if (daysOfWeek && daysOfWeek.includes(date.getDay())) {
    return true;
  }

  if (dates && dates.some((d) => isSameDay(d, date))) {
    return true;
  }

  if (matcher && matcher(date)) {
    return true;
  }

  return false;
}
