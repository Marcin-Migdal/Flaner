import { describe, expect, it } from "vitest";
import { getBudgetAccountSchema } from "./budget-account-schema";

const schema = getBudgetAccountSchema((key) => key);

describe("budget account schema", () => {
  it("trims the name and accepts a name with a currency", () => {
    expect(schema.parse({ name: "  Cash ", defaultCurrency: "PLN" })).toEqual({ name: "Cash", defaultCurrency: "PLN" });
  });

  it("asks for a name of at most 60 characters and a currency", () => {
    const issues = (data: { name: string; defaultCurrency: string }) =>
      schema.safeParse(data).error?.issues.map(({ message }) => message);

    expect(issues({ name: " ", defaultCurrency: "" })).toEqual([
      "budget.validation.accountNameRequired",
      "budget.validation.currencyRequired",
    ]);
    expect(issues({ name: "x".repeat(61), defaultCurrency: "PLN" })).toEqual(["budget.validation.accountNameMax"]);
  });
});
