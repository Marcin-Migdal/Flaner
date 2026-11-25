import { describe, expect, it } from "vitest";
import { getBudgetSplitOffSchema } from "./budget-split-off-schema";

const messages = (value: unknown, room = 10000) => {
  const result = getBudgetSplitOffSchema((key) => key, room).safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("getBudgetSplitOffSchema", () => {
  it("accepts an amount below the room, any category and a note", () => {
    expect(messages({ amount: 99.99, categoryId: null, note: "Lamp" })).toEqual([]);
  });

  it("keeps the sum of split-offs below the total", () => {
    expect(messages({ amount: 100, categoryId: "home", note: "" })).toEqual(["budget.validation.splitOffTooLarge"]);
    expect(messages({ amount: 0, categoryId: "home", note: "" })).toContain("budget.validation.amountPositive");
  });

  it("limits the note", () => {
    expect(messages({ amount: 1, categoryId: null, note: "x".repeat(201) })).toEqual(["budget.validation.splitOffNoteMax"]);
  });
});
