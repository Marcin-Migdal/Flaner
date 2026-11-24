import { getBudgetRecurringSchema, toRepeatRuleInput, type BudgetRecurringFormData } from "./budget-recurring-schema";

const t = (key: string) => key;
const start = new Date(2026, 10, 14);

const valid: BudgetRecurringFormData = {
  frequency: "monthly",
  interval: 1,
  weekdays: [],
  monthDay: 14,
  yearMonth: 11,
  yearDay: 14,
  endType: "never",
  endDate: null,
  endCount: null,
};

const issues = (data: BudgetRecurringFormData) => {
  const result = getBudgetRecurringSchema(t, start).safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("budget-recurring-schema", () => {
  it("accepts a valid rule and builds the API input", () => {
    expect(issues(valid)).toEqual([]);
    expect(toRepeatRuleInput(valid)).toEqual({
      pattern: { frequency: "monthly", interval: 1, day: 14 },
      end: { type: "never" },
    });
    expect(toRepeatRuleInput({ ...valid, frequency: "weekly", weekdays: [5, 1], endType: "after", endCount: 3 })).toEqual({
      pattern: { frequency: "weekly", interval: 1, weekdays: [1, 5] },
      end: { type: "after", count: 3 },
    });
  });

  it("needs a weekday for a weekly rule", () => {
    expect(issues({ ...valid, frequency: "weekly" })).toEqual(["budget.validation.weekdaysRequired"]);
  });

  it("needs an until date on or after the start and a count for 'after N times'", () => {
    expect(issues({ ...valid, endType: "until" })).toEqual(["budget.validation.endDateAfterStart"]);
    expect(issues({ ...valid, endType: "until", endDate: new Date(2026, 10, 13) })).toEqual([
      "budget.validation.endDateAfterStart",
    ]);
    expect(issues({ ...valid, endType: "until", endDate: new Date(2026, 10, 14) })).toEqual([]);
    expect(issues({ ...valid, endType: "after" })).toEqual(["budget.validation.numberRequired"]);
  });

  it("keeps every N between 1 and 99", () => {
    expect(issues({ ...valid, interval: 0 })).toEqual(["budget.validation.numberRange"]);
    expect(issues({ ...valid, interval: 1.5 })).toEqual(["budget.validation.wholeNumber"]);
  });
});
