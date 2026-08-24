import { isBefore, isWithinInterval, isSameMonth, isToday, isSameDay } from "date-fns";

export const isBetween = (day: Date, start: Date, end: Date): boolean => {
  const [from, to] = isBefore(start, end) ? [start, end] : [end, start];
  return isWithinInterval(day, { start: from, end: to });
};

export type GetCellClassParams = {
  day: Date;
  index: number;
  currentDate: Date;
  days: Date[];
  selectionMode?: "single" | "range" | undefined;
  hasEvents: boolean;
  selectedDate?: unknown;
  hoverDate: Date | null;
  isDisabled?: boolean;
};

export const getCellClass = ({
  day,
  index: _index,
  currentDate,
  days: _days,
  selectionMode,
  hasEvents,
  selectedDate,
  hoverDate,
  isDisabled,
}: GetCellClassParams): string => {
  const classes = ["w-full h-full relative"];

  if (!isSameMonth(day, currentDate)) {
    classes.push("opacity-25 bg-muted/60");
  }
  if (isToday(day)) {
    classes.push("bg-brand/5 ring-1 ring-inset ring-brand/30");
  }

  if (isDisabled) {
    classes.push("opacity-40 bg-muted/40 cursor-not-allowed select-none");
    return classes.join(" ");
  }

  if (!selectionMode) {
    return classes.join(" ");
  }

  classes.push("cursor-pointer");

  if (hasEvents) {
    // optional: classes.push("no-day-hover");
  }

  if (selectionMode === "single") {
    if (selectedDate && isSameDay(day, selectedDate as Date)) {
      classes.push("bg-brand text-brand-foreground hover:bg-brand/90");
    } else {
      classes.push("hover:bg-accent/50");
    }
  } else {
    // Range mode
    const rangeDate = selectedDate as [Date, Date?] | null | undefined;
    const rangeStart = rangeDate?.[0];
    const rangeEnd = rangeDate?.[1];

    const isStart = rangeStart && isSameDay(day, rangeStart);
    const isEnd = rangeEnd && isSameDay(day, rangeEnd);

    if (isStart || isEnd) {
      classes.push("bg-brand text-brand-foreground hover:bg-brand/90");
    } else {
      classes.push("hover:bg-accent/50");
    }

    if (rangeStart && !rangeEnd && hoverDate && !isBefore(hoverDate, rangeStart)) {
      if (isSameDay(day, hoverDate)) {
        if (!isSameDay(day, rangeStart)) {
          classes.push("bg-brand/70 text-brand-foreground");
        }
      } else if (isBetween(day, rangeStart, hoverDate) && !isSameDay(day, rangeStart)) {
        classes.push("bg-brand/15");
      }
    } else if (rangeStart && rangeEnd) {
      if (isBetween(day, rangeStart, rangeEnd) && !isSameDay(day, rangeStart) && !isSameDay(day, rangeEnd)) {
        classes.push("bg-brand/15");
      }
    }
  }

  return classes.join(" ");
};
