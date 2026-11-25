import { describe, expect, it } from "vitest";
import { amountPatch, categoryPatch, hasUnconfirmedCategory } from "./transactionEdits";

describe("amountPatch", () => {
  it("converts the new amount at the stored rate", () => {
    expect(amountPatch({ amount: 1000, amountMain: 4300, rate: 4.3, rateOverridden: false }, 2550)).toEqual({
      amount: 2550,
      amountMain: 10965,
    });
    expect(amountPatch({ amount: 1000, amountMain: 1000, rate: 1, rateOverridden: false }, 1234)).toEqual({
      amount: 1234,
      amountMain: 1234,
    });
  });

  it("keeps a hand-typed main-currency amount's effective rate", () => {
    expect(amountPatch({ amount: 1000, amountMain: 4500, rate: 4.3, rateOverridden: true }, 2000)).toEqual({
      amount: 2000,
      amountMain: 9000,
    });
  });
});

describe("categoryPatch", () => {
  it("confirms a set category and leaves a cleared one to review", () => {
    expect(categoryPatch("groceries")).toEqual({ categoryId: "groceries", confirmed: true });
    expect(categoryPatch(null)).toEqual({ categoryId: null, confirmed: false });
  });
});

describe("hasUnconfirmedCategory", () => {
  it("is a category still to approve (a rule's guess), never a missing one", () => {
    expect(hasUnconfirmedCategory({ categoryId: "groceries", confirmed: false })).toBe(true);
    expect(hasUnconfirmedCategory({ categoryId: "groceries", confirmed: true })).toBe(false);
    expect(hasUnconfirmedCategory({ categoryId: null, confirmed: false })).toBe(false);
  });
});
