import { describe, expect, it } from "vitest";
import { getBudgetPlanAmountSchema } from "./budget-plan-schema";

const schema = getBudgetPlanAmountSchema((key) => key);
const messages = (value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("getBudgetPlanAmountSchema", () => {
  it("accepts a category with a positive amount of at most two decimals", () => {
    expect(messages({ categoryId: "groceries", amount: 1000.5 })).toEqual([]);
  });

  it("requires a category and a positive amount with at most two decimals", () => {
    expect(messages({ categoryId: "", amount: 10 })).toEqual(["budget.validation.categoryRequired"]);
    expect(messages({ categoryId: null, amount: 10 })).toEqual(["budget.validation.categoryRequired"]);
    expect(messages({ categoryId: "groceries", amount: 0 })).toEqual(["budget.validation.amountPositive"]);
    expect(messages({ categoryId: "groceries", amount: 1.005 })).toEqual(["budget.validation.amountDecimals"]);
    expect(messages({ categoryId: "groceries", amount: undefined })).toEqual(["budget.validation.amountRequired"]);
  });
});
