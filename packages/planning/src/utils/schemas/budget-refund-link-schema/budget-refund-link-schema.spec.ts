import { describe, expect, it } from "vitest";
import { getBudgetRefundLinkSchema } from "./budget-refund-link-schema";

const messages = (value: unknown) => {
  const result = getBudgetRefundLinkSchema((key) => key, 5000).safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("getBudgetRefundLinkSchema", () => {
  it("needs a picked refund and an amount below the room", () => {
    expect(messages({ refundId: "r", amount: 49.99 })).toEqual([]);
    expect(messages({ refundId: "", amount: 10 })).toEqual(["budget.validation.refundRequired"]);
    expect(messages({ refundId: "r", amount: 50 })).toEqual(["budget.validation.refundTooLarge"]);
  });
});
