import { format, parseISO, type Locale } from "date-fns";
import type { ProposedDateSlot } from "../../api/events/types";
import { isSameDaySlot } from "../slotRanking";

const shortWeekday = (date: Date, locale: Locale) => format(date, "EEE", { locale }).replace(/\.$/, "");

/** "dd.MM.yyyy (Mon)" for one day, "dd.MM (Mon) - dd.MM (Wed)" for a range, with years when it crosses one */
export const formatSlotDate = (slot: Pick<ProposedDateSlot, "start" | "end">, locale: Locale): string => {
  const startDate = parseISO(slot.start);
  const startDay = shortWeekday(startDate, locale);

  if (isSameDaySlot(slot)) {
    return `${format(startDate, "dd.MM.yyyy")} (${startDay})`;
  }

  const endDate = parseISO(slot.end);
  const endDay = shortWeekday(endDate, locale);
  const dateFormat = startDate.getFullYear() === endDate.getFullYear() ? "dd.MM" : "dd.MM.yyyy";

  return `${format(startDate, dateFormat)} (${startDay}) - ${format(endDate, dateFormat)} (${endDay})`;
};
