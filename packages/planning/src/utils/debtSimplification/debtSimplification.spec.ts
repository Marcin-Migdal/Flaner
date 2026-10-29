import { describe, expect, it } from "vitest";
import { calculateSimplifiedDebts } from "./debtSimplification";

describe("calculateSimplifiedDebts", () => {
  it("returns empty array when balances are empty or all zero", () => {
    expect(calculateSimplifiedDebts({}, "PLN")).toEqual([]);
    expect(calculateSimplifiedDebts({ u1: 0, u2: 0 }, "PLN")).toEqual([]);
  });

  it("calculates single transfer for 2 users with matching balance", () => {
    const balances = {
      userA: -1000,
      userB: 1000,
    };
    const debts = calculateSimplifiedDebts(balances, "EUR");
    expect(debts).toEqual([
      { from: "userA", to: "userB", amount: 1000, currency: "EUR" },
    ]);
  });

  it("simplifies debts among 3 users (A owes B and C)", () => {
    const balances = {
      userA: -3000,
      userB: 2000,
      userC: 1000,
    };
    const debts = calculateSimplifiedDebts(balances, "USD");
    expect(debts).toHaveLength(2);
    expect(debts).toEqual([
      { from: "userA", to: "userB", amount: 2000, currency: "USD" },
      { from: "userA", to: "userC", amount: 1000, currency: "USD" },
    ]);
  });

  it("reduces cyclic/indirect debts to minimal transfers", () => {
    // A owes 4000, B owes 1000, C is owed 5000
    const balances = {
      userA: -4000,
      userB: -1000,
      userC: 5000,
    };
    const debts = calculateSimplifiedDebts(balances, "PLN");
    expect(debts).toHaveLength(2);
    expect(debts).toEqual([
      { from: "userA", to: "userC", amount: 4000, currency: "PLN" },
      { from: "userB", to: "userC", amount: 1000, currency: "PLN" },
    ]);
  });

  it("sorts multiple debtors and creditors to match largest first", () => {
    const balances = {
      userA: -1000,
      userB: -5000,
      userC: 2000,
      userD: 4000,
    };
    const debts = calculateSimplifiedDebts(balances, "PLN");
    expect(debts.length).toBeGreaterThan(0);
    // userB (5000) should be matched with userD (4000) first
    expect(debts[0]).toEqual({ from: "userB", to: "userD", amount: 4000, currency: "PLN" });
  });
});
