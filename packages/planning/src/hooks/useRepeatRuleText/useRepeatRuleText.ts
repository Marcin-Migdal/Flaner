import { parseISO } from "date-fns";
import type { IsoWeekday, RepeatPattern, RepeatRule } from "../../api/budget";
import { usePlanningTranslations } from "../usePlanningTranslations";

// 2024-01-01 was a Monday; 2024 is a leap year, so 29 February has a name
const weekdayDate = (weekday: IsoWeekday) => new Date(2024, 0, weekday);

/** Short weekday names in the UI language, Monday first. */
export const useWeekdayNames = () => {
  const { i18n } = usePlanningTranslations();
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
  return (weekday: IsoWeekday) => weekdayFormat.format(weekdayDate(weekday));
};

/** Describes a repeat rule in words ("Every 2 weeks on Mon, Thu · until 31 Dec 2026"). */
export const useRepeatRuleText = () => {
  const { t, i18n } = usePlanningTranslations();
  const weekdayName = useWeekdayNames();
  const dayMonthFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long" });
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });

  const describePattern = (pattern: RepeatPattern) => {
    const count = pattern.interval;
    if (pattern.frequency === "weekly") {
      return t("budget.repeatRule.weekly", { count, days: pattern.weekdays.map(weekdayName).join(", ") });
    }
    if (pattern.frequency === "monthly") {
      return pattern.day === "last"
        ? t("budget.repeatRule.monthlyLast", { count })
        : t("budget.repeatRule.monthlyDay", { count, day: pattern.day });
    }
    return t("budget.repeatRule.yearly", {
      count,
      date: dayMonthFormat.format(new Date(2024, pattern.month - 1, pattern.day)),
    });
  };

  return ({ pattern, end }: RepeatRule) => {
    const text = describePattern(pattern);
    if (end.type === "never") return text;
    return t("budget.repeatRule.until", { rule: text, date: dateFormat.format(parseISO(end.date)) });
  };
};
