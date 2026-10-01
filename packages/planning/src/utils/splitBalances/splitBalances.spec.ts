import { describe, expect, it } from "vitest";
import {
  getPairKey,
  applyExpenseToBalances,
  applySettlementToBalances,
  addToCurrencyTotals,
  getUserBalances,
  hasOutstandingBalance,
  isGroupSettled,
  getPairwiseDebts,
  getSimplifiedDebts,
  summarizeUserDebts,
  convertAmount,
  convertSplits,
  getOutstandingDebtAmount,
  type GroupBalanceState,
} from "./splitBalances";
import type { SplitGroup } from "../../api/splits/types";

describe("splitBalances", () => {
  it("getPairKey returns consistent alphabetical ordering", () => {
    expect(getPairKey("userA", "userB")).toBe("userA__userB");
    expect(getPairKey("userB", "userA")).toBe("userA__userB");
  });

  it("addToCurrencyTotals correctly updates amounts and removes zeros", () => {
    let totals = addToCurrencyTotals({}, "PLN", 100);
    expect(totals).toEqual({ PLN: 100 });

    totals = addToCurrencyTotals(totals, "PLN", -100);
    expect(totals).toEqual({});
  });

  it("applies expense to balances and reverts with negative direction", () => {
    const initialState: GroupBalanceState = {
      balances: {},
      pairBalances: {},
    };

    const expense = {
      paidBy: "userA",
      currency: "PLN",
      splits: [
        { userId: "userA", amount: 50 },
        { userId: "userB", amount: 50 },
      ],
    };

    // Apply expense
    const afterExpense = applyExpenseToBalances(initialState, expense, 1);
    expect(afterExpense.balances.PLN).toEqual({ userA: 50, userB: -50 });

    // Revert expense
    const reverted = applyExpenseToBalances(afterExpense, expense, -1);
    expect(reverted.balances.PLN).toBeUndefined();
    expect(reverted.pairBalances.PLN).toBeUndefined();
  });

  it("applies settlement to balances and checks settled state", () => {
    const initialState: GroupBalanceState = {
      balances: { PLN: { userA: 50, userB: -50 } },
      pairBalances: { PLN: { [getPairKey("userA", "userB")]: 50 } },
    };

    const settlement = {
      payerId: "userB",
      receiverId: "userA",
      amount: 50,
      currency: "PLN",
    };

    const afterSettlement = applySettlementToBalances(initialState, settlement, 1);
    expect(afterSettlement.balances.PLN).toBeUndefined();
    expect(isGroupSettled(afterSettlement)).toBe(true);
  });

  it("calculates getUserBalances, hasOutstandingBalance, and isGroupSettled", () => {
    const state: GroupBalanceState = {
      balances: { PLN: { userA: 100, userB: -100 } },
      pairBalances: { PLN: { [getPairKey("userA", "userB")]: 100 } },
      simplifyDebts: true,
    };

    expect(getUserBalances(state, "userA")).toEqual({ PLN: 100 });
    expect(getUserBalances(state, "userC")).toEqual({});
    expect(hasOutstandingBalance(state, "userA")).toBe(true);
    expect(hasOutstandingBalance(state, "userC")).toBe(false);
    expect(isGroupSettled(state)).toBe(false);
  });

  it("extracts pairwise debts and simplified debts", () => {
    const pairBalances = {
      PLN: {
        [getPairKey("userA", "userB")]: 100, // userA is creditor, userB owes userA
      },
    };

    const pairwiseDebts = getPairwiseDebts(pairBalances);
    expect(pairwiseDebts).toHaveLength(1);
    expect(pairwiseDebts[0].currency).toBe("PLN");

    const balances = {
      PLN: {
        userA: 100,
        userB: -100,
      },
    };
    const simplified = getSimplifiedDebts(balances);
    expect(simplified).toHaveLength(1);
  });

  it("summarizes user debts correctly", () => {
    const debts = [
      { from: "userA", to: "userB", amount: 100, currency: "PLN" },
      { from: "userC", to: "userA", amount: 50, currency: "PLN" },
    ];

    const summary = summarizeUserDebts(debts, "userA");
    expect(summary.youOwe).toEqual({ PLN: 100 });
    expect(summary.youOweCount).toBe(1);
    expect(summary.owedToYou).toEqual({ PLN: 50 });
    expect(summary.owedToYouCount).toBe(1);
  });

  it("converts amounts and splits proportionally assigning remainder to largest split", () => {
    expect(convertAmount(100, 1.2)).toBe(120);

    const splits = [
      { userId: "u1", amount: 100 },
      { userId: "u2", amount: 200 },
    ];
    const converted = convertSplits(splits, 1.2, 361);
    expect(converted).toEqual([
      { userId: "u1", amount: 120 },
      { userId: "u2", amount: 241 },
    ]);

    // Zero difference or empty splits returns directly
    expect(convertSplits([], 1.2, 0)).toEqual([]);
    expect(convertSplits([{ userId: "u1", amount: 100 }], 1, 100)).toEqual([{ userId: "u1", amount: 100 }]);
  });

  it("checks hasOutstandingBalance and getPairwiseDebts with non-simplified pair balances", () => {
    const pairwiseState: GroupBalanceState = {
      balances: { PLN: { userA: 100, userB: -100 } },
      pairBalances: {
        PLN: {
          [getPairKey("userA", "userB")]: 100,
          [getPairKey("userC", "userD")]: 0,
        },
      },
      simplifyDebts: false,
    };
    expect(hasOutstandingBalance(pairwiseState, "userA")).toBe(true);
    expect(hasOutstandingBalance(pairwiseState, "userB")).toBe(true);
    expect(hasOutstandingBalance(pairwiseState, "userC")).toBe(false);
    expect(hasOutstandingBalance(pairwiseState, "userZ")).toBe(false);
    expect(isGroupSettled(pairwiseState)).toBe(false);

    const pairwiseSettledState: GroupBalanceState = {
      pairBalances: {
        PLN: {
          [getPairKey("userA", "userB")]: 0,
        },
      },
      simplifyDebts: false,
    };
    expect(isGroupSettled(pairwiseSettledState)).toBe(true);

    const zeroDebts = getPairwiseDebts({
      PLN: {
        [getPairKey("userA", "userB")]: 0,
      },
    });
    expect(zeroDebts).toHaveLength(0);
  });

  it("getOutstandingDebtAmount gets correct amount based on debt mode", () => {
    const group: SplitGroup = {
      id: "group-1",
      name: "Trip",
      description: "Test group",
      defaultCurrency: "PLN",
      lastUsedCurrency: "PLN",
      createdBy: "userA",
      participants: ["userA", "userB"],
      formerParticipants: [],
      balances: { PLN: { userA: 100, userB: -100 } },
      pairBalances: { PLN: { [getPairKey("userA", "userB")]: 100 } },
      totalSpent: { PLN: 100 },
      expensesCount: 1,
      settlementsCount: 0,
      simplifyDebts: false,
      status: "active",
      createdAt: 1000,
      updatedAt: 1000,
    };

    const amount = getOutstandingDebtAmount(group, "userB", "userA", "PLN");
    expect(amount).toBe(100);

    // Test with simplifyDebts true
    const groupSimplified = { ...group, simplifyDebts: true };
    const amountSimplified = getOutstandingDebtAmount(groupSimplified, "userB", "userA", "PLN");
    expect(amountSimplified).toBe(100);
  });
});
