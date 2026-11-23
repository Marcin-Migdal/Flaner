import { describe, expect, it } from "vitest";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import { buildMonthLedger, resolveTransactionCategory, signedAmount } from "./monthLedger";

const accounts: BudgetAccount[] = [
  { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  { id: "savings", name: "Savings", defaultCurrency: "PLN", hidden: true, createdAt: 2 },
];

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "shopping",
      name: "Shopping",
      icon: "shopping-bag",
      color: 1,
      subcategories: [{ id: "groceries", name: "Groceries" }],
    },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 2, subcategories: [] }],
};

let nextId = 0;
const tx = (overrides: Partial<BudgetTransaction>): BudgetTransaction => ({
  id: `t${++nextId}`,
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: 1000,
  currency: "PLN",
  amountMain: 1000,
  rate: 1,
  rateDate: "2026-11-10",
  rateOverridden: false,
  payee: "Shop",
  description: "",
  categoryId: "groceries",
  confirmed: true,
  excluded: false,
  ...overrides,
});

describe("buildMonthLedger", () => {
  it("sums income, expenses and balance in the main currency", () => {
    const ledger = buildMonthLedger({
      month: "2026-11",
      accounts,
      transactions: [
        tx({ type: "income", amount: 500000, amountMain: 500000, categoryId: "salary" }),
        tx({ amount: 2000, currency: "EUR", amountMain: 8600 }),
        tx({ amount: 1400, amountMain: 1400 }),
      ],
    });

    expect(ledger.totals).toEqual({ income: 500000, expenses: 10000, balance: 490000 });
  });

  it("counts only transactions dated in the month", () => {
    const ledger = buildMonthLedger({
      month: "2026-11",
      accounts,
      transactions: [
        tx({ date: "2026-10-31", amountMain: 700 }),
        tx({ date: "2026-11-01", amountMain: 100 }),
        tx({ date: "2026-11-30", amountMain: 200 }),
        tx({ date: "2026-12-01", amountMain: 900 }),
      ],
    });

    expect(ledger.totals.expenses).toBe(300);
    expect(ledger.days.map((day) => day.date)).toEqual(["2026-11-30", "2026-11-01"]);
  });

  it("leaves excluded transactions and hidden accounts out of the totals and the list", () => {
    const ledger = buildMonthLedger({
      month: "2026-11",
      accounts,
      transactions: [
        tx({ amountMain: 100 }),
        tx({ amountMain: 5000, excluded: true }),
        tx({ amountMain: 7000, accountId: "savings" }),
      ],
    });

    expect(ledger.totals).toEqual({ income: 0, expenses: 100, balance: -100 });
    expect(ledger.days.flatMap((day) => day.transactions)).toHaveLength(1);
  });

  it("groups rows by day, newest day first, each with its net", () => {
    const groceries = tx({ date: "2026-11-03", amountMain: 3000 });
    const refundDay = tx({ date: "2026-11-03", type: "income", amountMain: 1000, categoryId: "salary" });
    const fuel = tx({ date: "2026-11-12", amountMain: 25000 });

    const ledger = buildMonthLedger({ month: "2026-11", accounts, transactions: [groceries, refundDay, fuel] });

    expect(ledger.days).toEqual([
      { date: "2026-11-12", net: -25000, transactions: [fuel] },
      // Within a day, the transaction added last comes first
      { date: "2026-11-03", net: -2000, transactions: [refundDay, groceries] },
    ]);
  });

  it("is empty for a month without transactions", () => {
    expect(buildMonthLedger({ month: "2026-11", accounts, transactions: [] })).toEqual({
      totals: { income: 0, expenses: 0, balance: 0 },
      days: [],
    });
  });
});

describe("resolveTransactionCategory", () => {
  it("finds a main category or a subcategory of the transaction's type", () => {
    expect(resolveTransactionCategory(categories, tx({ categoryId: "shopping" }))).toEqual({
      category: categories.expense[0],
      subcategory: null,
    });
    expect(resolveTransactionCategory(categories, tx({ categoryId: "groceries" }))).toEqual({
      category: categories.expense[0],
      subcategory: { id: "groceries", name: "Groceries" },
    });
  });

  it("reads a missing, deleted or other-type category as Uncategorized", () => {
    expect(resolveTransactionCategory(categories, tx({ categoryId: null }))).toBeNull();
    expect(resolveTransactionCategory(categories, tx({ categoryId: "deleted" }))).toBeNull();
    expect(resolveTransactionCategory(categories, tx({ type: "income", categoryId: "groceries" }))).toBeNull();
  });
});

describe("signedAmount", () => {
  it("gives an expense a minus and never returns -0", () => {
    expect(signedAmount("expense", 1250)).toBe(-1250);
    expect(signedAmount("income", 1250)).toBe(1250);
    expect(Object.is(signedAmount("expense", 0), 0)).toBe(true);
  });
});
