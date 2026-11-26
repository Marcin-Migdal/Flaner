import { describe, expect, it } from "vitest";
import type { BudgetAccount, BudgetCategoryTree, BudgetRecurring, BudgetTransaction } from "../../api/budget";
import { buildPlannerMonth } from "../plannerMonth";
import { linkCandidates, missingLimits, prefillLimits, startingPlan } from "./plannerRecurring";

const accounts: BudgetAccount[] = [{ id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 }];

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "home",
      name: "Home",
      icon: "house",
      color: 3,
      subcategories: [
        { id: "rent", name: "Rent" },
        { id: "internet", name: "Internet" },
      ],
    },
    { id: "subscriptions", name: "Subscriptions", icon: "music", color: 5, subcategories: [] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 4, subcategories: [] }],
};

// Monthly on the 10th from January 2026
const recurring = (id: string, categoryId: string | null, overrides: Partial<BudgetRecurring> = {}): BudgetRecurring => ({
  id,
  accountId: "main",
  type: "expense",
  payee: id,
  categoryId,
  amount: 5000,
  currency: "PLN",
  amountMain: 5000,
  rule: { pattern: { frequency: "monthly", interval: 1, day: 10 }, start: "2026-01-10", end: { type: "never" } },
  occurrences: {},
  createdAt: 1,
  ...overrides,
});

const prefill = (limits: Record<string, number>, list: BudgetRecurring[]) =>
  prefillLimits({ month: "2026-12", accounts, categories, limits, recurring: { list, today: "2026-11-25" } });

describe("prefillLimits", () => {
  it("adds the expected recurring where a category or subcategory with recurring has no limit", () => {
    const list = [
      recurring("rent", "rent", { amountMain: 250000 }),
      recurring("netflix", "subscriptions", { amountMain: 4300 }),
      recurring("spotify", "subscriptions", { amountMain: 2399 }),
    ];

    expect(prefill({}, list).map(({ categoryId, amount }) => [categoryId, amount])).toEqual([
      ["rent", 250000],
      ["subscriptions", 6699],
    ]);
  });

  it("never changes an existing limit, and a parent's limit does not count as the subcategory's own", () => {
    const list = [recurring("rent", "rent", { amountMain: 250000 }), recurring("isp", "internet", { amountMain: 6000 })];

    // Rent keeps its lower limit; Internet has none of its own under the limited Home
    expect(prefill({ home: 300000, rent: 200000 }, list).map(({ categoryId, amount }) => [categoryId, amount])).toEqual([
      ["internet", 6000],
    ]);
  });

  it("skips income, Uncategorized and months with nothing due", () => {
    const list = [
      recurring("salary", "salary", { type: "income" }),
      recurring("unknown", null),
      recurring("yearly", "subscriptions", {
        rule: { pattern: { frequency: "yearly", interval: 1, month: 3, day: 1 }, start: "2026-03-01", end: { type: "never" } },
      }),
    ];

    expect(prefill({}, list)).toEqual([]);
  });

  it("starts the plan from the copy plus the prefill limits, without dismissed banners", () => {
    const additions = prefill({ rent: 200000 }, [recurring("netflix", "subscriptions")]);
    const copy = { limits: { rent: 200000 }, plannedIncome: { salary: 845000 }, dismissedRecurring: ["netflix"] };

    expect(startingPlan("2026-12", copy, additions)).toEqual({
      month: "2026-12",
      limits: { rent: 200000, subscriptions: 5000 },
      plannedIncome: { salary: 845000 },
    });
    expect(startingPlan("2026-12", null, [])).toEqual({ month: "2026-12", limits: {}, plannedIncome: {} });
  });
});

describe("missingLimits", () => {
  const list = [recurring("netflix", "subscriptions"), recurring("isp", "internet"), recurring("unknown", null)];
  const planner = (limits: Record<string, number>) =>
    buildPlannerMonth({
      month: "2026-12",
      accounts,
      categories,
      transactions: [],
      plan: { month: "2026-12", limits, plannedIncome: {} },
      recurring: { list, today: "2026-11-25" },
    });

  it("lists each recurring transaction of a planned month without a limit, never Uncategorized", () => {
    const missing = missingLimits(planner({ home: 300000 }), { month: "2026-12", limits: { home: 300000 }, plannedIncome: {} });

    expect(missing.map(({ planRecurring, categoryId, amount }) => [planRecurring.recurring.id, categoryId, amount])).toEqual([
      ["isp", "internet", 5000],
      ["netflix", "subscriptions", 5000],
    ]);
  });

  it("hides a banner dismissed in this month's plan, and shows none in a month without a plan", () => {
    const plan = { month: "2026-12", limits: {}, plannedIncome: {}, dismissedRecurring: ["netflix"] };

    expect(missingLimits(planner({}), plan).map(({ planRecurring }) => planRecurring.recurring.id)).toEqual(["isp"]);
    expect(missingLimits(planner({}), null)).toEqual([]);
  });
});

describe("linkCandidates", () => {
  const transaction = (id: string, date: string, overrides: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
    id,
    accountId: "main",
    date,
    type: "expense",
    amount: 5000,
    currency: "PLN",
    amountMain: 5000,
    rate: 1,
    rateDate: date,
    rateOverridden: false,
    payee: "Anything",
    description: "",
    categoryId: "subscriptions",
    confirmed: true,
    excluded: false,
    ...overrides,
  });

  it("offers the month's transactions of the account and category, nearest the due date first, matched ones marked", () => {
    const netflix = recurring("netflix", "subscriptions");
    const other = recurring("other", "subscriptions", { occurrences: { "2026-11-03": { transactionId: "matched", date: "2026-11-03", amount: 1, amountMain: 1 } } });
    const candidates = linkCandidates(
      netflix,
      "2026-11-10",
      [
        transaction("far", "2026-11-28"),
        transaction("matched", "2026-11-03"),
        transaction("near", "2026-11-12"),
        transaction("excluded", "2026-11-10", { excluded: true }),
        transaction("otherAccount", "2026-11-10", { accountId: "savings" }),
        transaction("otherCategory", "2026-11-10", { categoryId: "rent" }),
        transaction("income", "2026-11-10", { type: "income" }),
      ],
      [netflix, other],
    );

    expect(candidates.map(({ transaction: { id }, matched }) => [id, matched])).toEqual([
      ["near", false],
      ["matched", true],
      ["far", false],
    ]);
  });
});
