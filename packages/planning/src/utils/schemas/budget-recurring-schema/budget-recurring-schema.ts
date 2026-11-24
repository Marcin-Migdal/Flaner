import { format } from "date-fns";
import * as z from "zod";
import { REPEAT_END_TYPES, REPEAT_FREQUENCIES, type RepeatRuleInput } from "../../../api/budget";

const wholeNumber = (t: (key: string) => string, min: number, max: number) =>
  z
    .number({ message: t("budget.validation.numberRequired") })
    .int(t("budget.validation.wholeNumber"))
    .min(min, t("budget.validation.numberRange"))
    .max(max, t("budget.validation.numberRange"));

/**
 * The repeat rule editor (Make recurring, Edit rule). `start` is the day the rule starts (the transaction's date, or
 * today for an edit): an until date cannot be before it.
 */
export const getBudgetRecurringSchema = (t: (key: string) => string, start: Date) =>
  z
    .object({
      frequency: z.enum(REPEAT_FREQUENCIES),
      interval: wholeNumber(t, 1, 99),
      weekdays: z.array(z.literal([1, 2, 3, 4, 5, 6, 7])),
      monthDay: z.union([wholeNumber(t, 1, 31), z.literal("last")]),
      yearMonth: wholeNumber(t, 1, 12),
      yearDay: wholeNumber(t, 1, 31),
      endType: z.enum(REPEAT_END_TYPES),
      endDate: z.date().nullable(),
      endCount: wholeNumber(t, 1, 999).nullable(),
    })
    .superRefine((data, ctx) => {
      if (data.frequency === "weekly" && data.weekdays.length === 0) {
        ctx.addIssue({ code: "custom", path: ["weekdays"], message: t("budget.validation.weekdaysRequired") });
      }
      if (data.endType === "until" && (!data.endDate || format(data.endDate, "yyyy-MM-dd") < format(start, "yyyy-MM-dd"))) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: t("budget.validation.endDateAfterStart") });
      }
      if (data.endType === "after" && data.endCount === null) {
        ctx.addIssue({ code: "custom", path: ["endCount"], message: t("budget.validation.numberRequired") });
      }
    });

export type BudgetRecurringFormData = z.infer<ReturnType<typeof getBudgetRecurringSchema>>;

/** The rule the API takes from valid form data. */
export const toRepeatRuleInput = (data: BudgetRecurringFormData): RepeatRuleInput => {
  const pattern: RepeatRuleInput["pattern"] =
    data.frequency === "weekly"
      ? { frequency: "weekly", interval: data.interval, weekdays: [...data.weekdays].sort((a, b) => a - b) }
      : data.frequency === "monthly"
        ? { frequency: "monthly", interval: data.interval, day: data.monthDay }
        : { frequency: "yearly", interval: data.interval, month: data.yearMonth, day: data.yearDay };

  if (data.endType === "until" && data.endDate) {
    return { pattern, end: { type: "until", date: format(data.endDate, "yyyy-MM-dd") } };
  }
  if (data.endType === "after" && data.endCount !== null) return { pattern, end: { type: "after", count: data.endCount } };
  return { pattern, end: { type: "never" } };
};
