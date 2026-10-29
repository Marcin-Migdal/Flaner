import { describe, expect, it } from "vitest";
import { getCreateExpenseSchema } from "./create-expense-schema";

describe("getCreateExpenseSchema", () => {
  const t = (key: string) => key;
  const schema = getCreateExpenseSchema(t);

  const validEqualExpense = {
    title: "Dinner",
    amount: 100,
    currency: "PLN",
    category: "food" as const,
    date: new Date(),
    paidBy: "userA",
    splitType: "equally" as const,
    splits: [
      { userId: "userA", included: true },
      { userId: "userB", included: true },
    ],
  };

  it("validates valid equal expense", () => {
    const result = schema.safeParse(validEqualExpense);
    expect(result.success).toBe(true);
  });

  it("fails if equal expense has no included participants", () => {
    const result = schema.safeParse({
      ...validEqualExpense,
      splits: [
        { userId: "userA", included: false },
        { userId: "userB", included: false },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("validates exact splits with matching total", () => {
    const result = schema.safeParse({
      ...validEqualExpense,
      splitType: "exact",
      splits: [
        { userId: "userA", included: true, amount: 60 },
        { userId: "userB", included: true, amount: 40 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("fails if sum of exact splits does not match expense amount", () => {
    const result = schema.safeParse({
      ...validEqualExpense,
      splitType: "exact",
      splits: [
        { userId: "userA", included: true, amount: 60 },
        { userId: "userB", included: true, amount: 30 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("fails on invalid amount or more than 2 decimals", () => {
    const result = schema.safeParse({
      ...validEqualExpense,
      amount: 10.999,
    });
    expect(result.success).toBe(false);
  });

  it("fails if exact split amount has more than 2 decimals or is negative", () => {
    const resultNegative = schema.safeParse({
      ...validEqualExpense,
      splitType: "exact",
      splits: [
        { userId: "userA", included: true, amount: -10 },
        { userId: "userB", included: true, amount: 110 },
      ],
    });
    expect(resultNegative.success).toBe(false);

    const resultDecimals = schema.safeParse({
      ...validEqualExpense,
      splitType: "exact",
      splits: [
        { userId: "userA", included: true, amount: 50.123 },
        { userId: "userB", included: true, amount: 49.877 },
      ],
    });
    expect(resultDecimals.success).toBe(false);
  });
});
