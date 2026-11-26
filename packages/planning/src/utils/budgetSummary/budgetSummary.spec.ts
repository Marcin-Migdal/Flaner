import { describe, expect, it } from "vitest";
import type {
  BudgetAccount,
  BudgetCategory,
  BudgetCategoryTree,
  BudgetRecurring,
  BudgetTransaction,
} from "../../api/budget";
import { buildMonthLedger } from "../monthLedger";
import { buildPlannerMonth } from "../plannerMonth";
import { UNCATEGORIZED_FILTER } from "../transactionFilters";
import {
  buildMonthlyTotals,
  buildPlanProgress,
  buildSpendingBreakdown,
  countToReview,
  daysLeftInMonth,
  monthsEndingOn,
  summarizeRecurringMonth,
  totalsChange,
} from "./budgetSummary";

const accounts: BudgetAccount[] = [
  { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  { id: "savings", name: "Savings", defaultCurrency: "PLN", hidden: true, createdAt: 2 },
];

const category = (id: string, subcategories: string[] = []): BudgetCategory => ({
  id,
  name: id,
  icon: "tag",
  color: 1,
  subcategories: subcategories.map((sub) => ({ id: sub, name: sub })),
});

const tree: BudgetCategoryTree = {
  expense: [
    category("food", ["groceries", "restaurants"]),
    category("home", ["rent"]),
    category("c3"),
    category("c4"),
    category("c5"),
    category("c6"),
    category("c7"),
    category("c8"),
    category("c9"),
  ],
  income: [category("salary")],
};

let nextId = 0;
const tx = (overrides: Partial<BudgetTransaction>): BudgetTransaction => ({
  id: `t${++nextId}`,
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: 100,
  currency: "PLN",
  amountMain: 100,
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

const entriesOf = (transactions: BudgetTransaction[]) =>
  buildMonthLedger({ month: "2026-11", transactions, accounts }).entries;

describe("buildSpendingBreakdown", () => {
  it("groups expenses by main category with its subcategories (and the category itself), largest first", () => {
    const breakdown = buildSpendingBreakdown(
      entriesOf([
        tx({ categoryId: "groceries", amountMain: 300 }),
        tx({ categoryId: "restaurants", amountMain: 500 }),
        tx({ categoryId: "food", amountMain: 50 }),
        tx({ categoryId: "rent", amountMain: 2000 }),
        tx({ type: "income", categoryId: "salary", amountMain: 9000 }),
      ]),
      tree,
    );

    expect(breakdown.total).toBe(2850);
    expect(breakdown.top.map(({ id, amount }) => [id, amount])).toEqual([
      ["home", 2000],
      ["food", 850],
    ]);
    expect(breakdown.top[1].parts.map(({ id, amount }) => [id, amount])).toEqual([
      ["restaurants", 500],
      ["groceries", 300],
      ["food", 50],
    ]);
    expect(breakdown.top[1].parts[2].subcategory).toBeNull();
    expect(breakdown.others).toEqual([]);
  });

  it("counts missing and unknown categories and split-offs under their own category", () => {
    const breakdown = buildSpendingBreakdown(
      entriesOf([
        tx({ categoryId: null, amountMain: 40 }),
        tx({ categoryId: "deleted", amountMain: 60 }),
        tx({
          categoryId: "groceries",
          amount: 1000,
          amountMain: 1000,
          splitOffs: [
            { id: "s1", amount: 200, categoryId: "rent", note: "", excluded: false },
            { id: "s2", amount: 300, categoryId: "c3", note: "", excluded: true },
          ],
        }),
      ]),
      tree,
    );

    expect(breakdown.top.map(({ id, amount }) => [id, amount])).toEqual([
      ["food", 500],
      ["home", 200],
      [UNCATEGORIZED_FILTER, 100],
    ]);
    expect(breakdown.total).toBe(800);
  });

  it("keeps the top 7 and folds the rest into Others", () => {
    const ids = ["food", "home", "c3", "c4", "c5", "c6", "c7", "c8", "c9"];
    const breakdown = buildSpendingBreakdown(
      entriesOf([
        ...ids.map((id, index) => tx({ categoryId: id, amountMain: 1000 - index * 100 })),
        tx({ categoryId: null, amountMain: 10 }),
      ]),
      tree,
    );

    expect(breakdown.top.map(({ id }) => id)).toEqual(["food", "home", "c3", "c4", "c5", "c6", "c7"]);
    expect(breakdown.others.map(({ id }) => id)).toEqual(["c8", "c9", UNCATEGORIZED_FILTER]);
    expect(breakdown.othersAmount).toBe(300 + 200 + 10);
  });

  it("folds the 8th category into Others; equal amounts keep the tree's order", () => {
    const ids = ["food", "home", "c3", "c4", "c5", "c6", "c7", "c8"];
    const breakdown = buildSpendingBreakdown(
      entriesOf(ids.map((id) => tx({ categoryId: id, amountMain: 100 }))),
      tree,
    );

    expect(breakdown.top.map(({ id }) => id)).toEqual(ids.slice(0, 7));
    expect(breakdown.others.map(({ id }) => id)).toEqual(["c8"]);
  });
});

describe("12-month bars", () => {
  it("lists the 12 months ending on the chosen month, across a year boundary", () => {
    const months = monthsEndingOn("2026-03", 12);

    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-04");
    expect(months.at(-1)).toBe("2026-03");
  });

  it("gives each month its ledger totals (excluded and hidden-account transactions left out)", () => {
    const rows = buildMonthlyTotals({
      months: ["2026-10", "2026-11"],
      accounts,
      transactions: [
        tx({ date: "2026-10-05", amountMain: 300 }),
        tx({ date: "2026-10-06", type: "income", categoryId: "salary", amountMain: 1000 }),
        tx({ date: "2026-11-05", amountMain: 200 }),
        tx({ date: "2026-11-06", amountMain: 999, excluded: true }),
        tx({ date: "2026-11-07", amountMain: 999, accountId: "savings" }),
      ],
    });

    expect(rows).toEqual([
      { month: "2026-10", totals: { income: 1000, expenses: 300, balance: 700 } },
      { month: "2026-11", totals: { income: 0, expenses: 200, balance: -200 } },
    ]);
  });

  it("gives the change against the previous month per total", () => {
    expect(
      totalsChange({ income: 500, expenses: 300, balance: 200 }, { income: 1000, expenses: 100, balance: 900 }),
    ).toEqual({ income: -500, expenses: 200, balance: -700 });
  });
});

describe("buildPlanProgress", () => {
  const planner = buildPlannerMonth({
    month: "2026-11",
    accounts,
    categories: tree,
    plan: { month: "2026-11", limits: { food: 1000, rent: 1500, c3: 500 }, plannedIncome: {} },
    transactions: [
      tx({ categoryId: "food", amountMain: 1200 }),
      tx({ categoryId: "rent", amountMain: 1600 }),
      tx({ categoryId: "c3", amountMain: 100 }),
      tx({ categoryId: "c4", amountMain: 70 }),
      tx({ categoryId: null, amountMain: 30 }),
    ],
  });

  it("puts all expenses against the sum of limits and lists every limit in the plan's order", () => {
    const progress = buildPlanProgress(planner, "2026-11", "2026-11-25");

    // As the Planner header: everything spent this month, Outside the plan included
    expect(progress.spent).toBe(1200 + 1600 + 100 + 70 + 30);
    expect(progress.limit).toBe(3000);
    expect(progress.limits.map(({ id, spent, limit, exceeded }) => [id, spent, limit, exceeded])).toEqual([
      ["food", 1200, 1000, true],
      ["rent", 1600, 1500, true],
      ["c3", 100, 500, false],
    ]);
    expect(progress.limits[1].subcategory?.id).toBe("rent");
    expect(progress.daysLeft).toBe(6);
  });

  it("counts days left: today included, all for a future month, none for a past one", () => {
    expect(daysLeftInMonth("2026-11", "2026-11-30")).toBe(1);
    expect(daysLeftInMonth("2026-11", "2026-11-01")).toBe(30);
    expect(daysLeftInMonth("2026-12", "2026-11-25")).toBe(31);
    expect(daysLeftInMonth("2026-10", "2026-11-25")).toBe(0);
  });
});

describe("countToReview", () => {
  it("counts unconfirmed and uncategorized transactions, each once, only among counted ones", () => {
    const ledger = buildMonthLedger({
      month: "2026-11",
      accounts,
      transactions: [
        tx({ confirmed: false }),
        tx({ categoryId: null }),
        tx({ categoryId: "deleted", confirmed: false }),
        tx({ splitOffs: [{ id: "s", amount: 10, categoryId: null, note: "", excluded: false }] }),
        tx({ splitOffs: [{ id: "s", amount: 10, categoryId: null, note: "", excluded: true }] }),
        tx({ confirmed: false, excluded: true }),
        tx({ confirmed: false, accountId: "savings" }),
        tx({ confirmed: false, date: "2026-10-10" }),
        tx({}),
      ],
    });

    expect(countToReview(ledger, tree)).toEqual({ unconfirmed: 2, uncategorized: 3, total: 4 });
  });
});

describe("summarizeRecurringMonth", () => {
  const recurring = (overrides: Partial<BudgetRecurring>): BudgetRecurring => ({
    id: "rec",
    accountId: "main",
    type: "expense",
    payee: "Netflix",
    categoryId: "c3",
    amount: 4500,
    currency: "PLN",
    amountMain: 4500,
    rule: { pattern: { frequency: "monthly", interval: 1, day: 10 }, start: "2026-01-10", end: { type: "never" } },
    occurrences: {},
    createdAt: 1,
    ...overrides,
  });

  it("lists the month's occurrences by date with N done and the amount still expected", () => {
    const month = summarizeRecurringMonth({
      month: "2026-11",
      today: "2026-11-12",
      accounts,
      recurring: [
        recurring({
          id: "rent",
          payee: "Rent",
          amountMain: 200000,
          rule: { pattern: { frequency: "monthly", interval: 1, day: 1 }, start: "2026-01-01", end: { type: "never" } },
          occurrences: {
            "2026-11-01": { transactionId: "t-rent", date: "2026-11-02", amount: 210000, amountMain: 210000 },
          },
        }),
        recurring({ id: "netflix", payee: "Netflix" }),
        recurring({
          id: "salary",
          type: "income",
          payee: "Employer",
          categoryId: "salary",
          amountMain: 900000,
          rule: { pattern: { frequency: "monthly", interval: 1, day: 28 }, start: "2026-01-28", end: { type: "never" } },
        }),
        recurring({ id: "hidden", accountId: "savings", payee: "Hidden" }),
      ],
    });

    expect(month.occurrences.map(({ recurring: item, dueDate, status, amountMain }) => [item.id, dueDate, status, amountMain])).toEqual([
      ["rent", "2026-11-01", "paid", 210000],
      ["netflix", "2026-11-10", "overdue", 4500],
      ["salary", "2026-11-28", "upcoming", 900000],
    ]);
    expect(month.done).toBe(1);
    expect(month.stillExpected).toBe(900000 - 4500);
  });
});
