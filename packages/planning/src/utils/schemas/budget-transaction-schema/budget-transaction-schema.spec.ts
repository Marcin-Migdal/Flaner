import { describe, expect, it } from "vitest";
import { getBudgetTransactionSchema, type BudgetTransactionFormData } from "./budget-transaction-schema";

const schema = getBudgetTransactionSchema((key) => key, "PLN");

const valid: BudgetTransactionFormData = {
  type: "expense",
  amount: 12.5,
  currency: "PLN",
  amountMain: null,
  rateOverridden: false,
  date: new Date(2026, 10, 14),
  payee: "Biedronka",
  description: "",
  accountId: "main",
  categoryId: null,
};

const errorsOf = (data: BudgetTransactionFormData) => {
  const result = schema.safeParse(data);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe("budget transaction schema", () => {
  it("accepts a transaction without a category or a description, also dated in the future", () => {
    expect(errorsOf(valid)).toEqual({});
    expect(errorsOf({ ...valid, date: new Date(2030, 0, 1) })).toEqual({});
  });

  it("needs a positive amount with at most two decimals, a payee and an account", () => {
    expect(errorsOf({ ...valid, amount: 0, payee: " ", accountId: "" })).toEqual({
      amount: "budget.validation.amountPositive",
      payee: "budget.validation.payeeRequired",
      accountId: "budget.validation.accountRequired",
    });
    expect(errorsOf({ ...valid, amount: 1.005 })).toEqual({ amount: "budget.validation.amountDecimals" });
  });

  it("needs the main-currency amount only for a foreign currency", () => {
    expect(errorsOf({ ...valid, currency: "EUR" })).toEqual({ amountMain: "budget.validation.amountRequired" });
    expect(errorsOf({ ...valid, currency: "EUR", amountMain: 53.4 })).toEqual({});
  });
});
