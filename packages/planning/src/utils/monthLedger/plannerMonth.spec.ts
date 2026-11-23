import { describe, expect, it } from "vitest";
import type { BudgetAccount, BudgetCategoryTree, BudgetPlan, BudgetTransaction } from "../../api/budget";
import { buildMonthLedger } from "./monthLedger";
import { buildPlannerMonth } from "./plannerMonth";

const accounts: BudgetAccount[] = [
  { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  { id: "savings", name: "Savings", defaultCurrency: "PLN", hidden: true, createdAt: 2 },
];

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "food",
      name: "Food",
      icon: "utensils",
      color: 1,
      subcategories: [
        { id: "groceries", name: "Groceries" },
        { id: "restaurants", name: "Restaurants" },
        { id: "coffee", name: "Coffee" },
      ],
    },
    {
      id: "transport",
      name: "Transport",
      icon: "car",
      color: 2,
      subcategories: [
        { id: "fuel", name: "Fuel" },
        { id: "parking", name: "Parking" },
      ],
    },
    { id: "home", name: "Home", icon: "house", color: 3, subcategories: [] },
  ],
  income: [
    { id: "salary", name: "Salary", icon: "wallet", color: 4, subcategories: [] },
    { id: "freelance", name: "Freelance", icon: "briefcase", color: 5, subcategories: [] },
    { id: "other-income", name: "Other income", icon: "banknote", color: 6, subcategories: [] },
  ],
};

let nextId = 0;
const tx = (categoryId: string | null, amountMain: number, overrides: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
  id: `t${++nextId}`,
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: amountMain,
  currency: "PLN",
  amountMain,
  rate: 1,
  rateDate: "2026-11-10",
  rateOverridden: false,
  payee: "Shop",
  description: "",
  categoryId,
  confirmed: true,
  excluded: false,
  ...overrides,
});
const income = (categoryId: string | null, amountMain: number) => tx(categoryId, amountMain, { type: "income" });

const plan = (overrides: Partial<BudgetPlan> = {}): BudgetPlan => ({
  month: "2026-11",
  limits: {},
  plannedIncome: {},
  ...overrides,
});

const build = (transactions: BudgetTransaction[], budgetPlan: BudgetPlan | null) =>
  buildPlannerMonth({ month: "2026-11", accounts, categories, transactions, plan: budgetPlan });

describe("buildPlannerMonth: category cards", () => {
  it("a card's Spent covers the category itself plus its subcategories that have limits", () => {
    const planner = build(
      [tx("food", 1000), tx("groceries", 4000), tx("restaurants", 2500), tx("coffee", 700)],
      plan({ limits: { food: 15000, groceries: 10000, restaurants: 3000 } }),
    );

    const [food] = planner.expenses.cards;
    expect(food.category.id).toBe("food");
    expect(food.target).toBe(15000);
    expect(food.limit).toBe(15000);
    expect(food.spent).toBe(7500);
    expect(food.lines.map(({ subcategory, spent, target }) => [subcategory.id, spent, target])).toEqual([
      ["groceries", 4000, 10000],
      ["restaurants", 2500, 3000],
    ]);
  });

  it("a card with limits on subcategories only adds them up and leaves the category's own spending outside", () => {
    const planner = build([tx("transport", 900), tx("fuel", 25110)], plan({ limits: { fuel: 40000 } }));

    const [transport] = planner.expenses.cards;
    expect(transport.target).toBeNull();
    expect(transport.limit).toBe(40000);
    expect(transport.spent).toBe(25110);
    expect(planner.expenses.outside.map((row) => [row.id, row.spent])).toEqual([["transport", 900]]);
  });

  it("shows a card for every category with a limit, in the tree's order, even without spending", () => {
    const planner = build([], plan({ limits: { home: 280000, groceries: 100000 } }));

    expect(planner.expenses.cards.map((card) => [card.category.id, card.spent, card.limit])).toEqual([
      ["food", 0, 100000],
      ["home", 0, 280000],
    ]);
  });

  it("an empty plan has no cards and puts all spending outside the plan", () => {
    const planner = build([tx("groceries", 4000)], null);

    expect(planner.expenses.cards).toEqual([]);
    expect(planner.expenses.outside.map((row) => [row.id, row.spent])).toEqual([["groceries", 4000]]);
  });

  it("ignores limits on categories no longer in the tree", () => {
    const planner = build([], plan({ limits: { deleted: 5000 } }));

    expect(planner.expenses.cards).toEqual([]);
    expect(planner.expenses.planned).toBe(0);
  });
});

describe("buildPlannerMonth: Outside the plan", () => {
  it("lists every category or subcategory with spending and no limit of its own, then Uncategorized", () => {
    const planner = build(
      [
        tx(null, 1849),
        tx("coffee", 6400),
        tx("parking", 3800),
        tx("groceries", 4000),
        tx("home", 12000),
        tx("missing-category", 151),
      ],
      plan({ limits: { food: 15000, groceries: 10000 } }),
    );

    expect(
      planner.expenses.outside.map((row) => [row.id, row.category?.id ?? null, row.subcategory?.id ?? null, row.spent]),
    ).toEqual([
      ["coffee", "food", "coffee", 6400],
      ["parking", "transport", "parking", 3800],
      ["home", "home", null, 12000],
      [null, null, null, 2000],
    ]);
    expect(planner.expenses.outsideSpent).toBe(24200);
  });

  it("keeps the row's transactions for the details sheet", () => {
    const coffee = tx("coffee", 6400);
    const planner = build([coffee, tx("groceries", 4000)], plan({ limits: { groceries: 10000 } }));

    expect(planner.expenses.outside[0].transactions).toEqual([coffee]);
  });
});

describe("buildPlannerMonth: totals", () => {
  it("cards and Outside the plan add up to the Transactions month totals exactly", () => {
    const transactions = [
      tx("food", 1000),
      tx("groceries", 4000),
      tx("coffee", 700),
      tx("fuel", 25110),
      tx(null, 1849),
      tx("groceries", 99999, { excluded: true }),
      tx("groceries", 88888, { accountId: "savings" }),
      tx("groceries", 77777, { date: "2026-12-01" }),
      income("salary", 845000),
      income("other-income", 12000),
      income(null, 500),
    ];
    const planner = build(transactions, plan({ limits: { food: 15000, groceries: 10000, fuel: 40000 } }));
    const { totals } = buildMonthLedger({ month: "2026-11", accounts, transactions });

    expect(planner.totals).toEqual(totals);
    const cardsSpent = planner.expenses.cards.reduce((sum, card) => sum + card.spent, 0);
    expect(cardsSpent + planner.expenses.outsideSpent).toBe(totals.expenses);
    expect(planner.expenses.spent).toBe(totals.expenses);
    const received = planner.income.cards.reduce((sum, card) => sum + card.spent, 0);
    expect(received + planner.income.outsideSpent).toBe(totals.income);
  });

  it("plans the month: sum of card limits, planned income and the planned balance", () => {
    const planner = build(
      [],
      plan({
        limits: { food: 15000, groceries: 10000, fuel: 40000, home: 280000 },
        plannedIncome: { salary: 845000, freelance: 150000 },
      }),
    );

    // Food's own limit stands for the whole card; Transport adds up its subcategory limits
    expect(planner.expenses.planned).toBe(15000 + 40000 + 280000);
    expect(planner.income.planned).toBe(995000);
    expect(planner.plannedBalance).toBe(995000 - 335000);
  });
});

describe("buildPlannerMonth: income mirror", () => {
  it("mirrors expenses: Received against Planned income, unplanned income outside the plan", () => {
    const planner = build(
      [income("salary", 845000), income("freelance", 50000), income("other-income", 12000)],
      plan({ plannedIncome: { salary: 845000, freelance: 150000 } }),
    );

    expect(planner.income.cards.map((card) => [card.category.id, card.spent, card.limit])).toEqual([
      ["salary", 845000, 845000],
      ["freelance", 50000, 150000],
    ]);
    expect(planner.income.outside.map((row) => [row.id, row.spent])).toEqual([["other-income", 12000]]);
  });

  it("never counts expense limits against income or the reverse", () => {
    const planner = build([income("salary", 1000), tx("groceries", 500)], plan({ limits: { salary: 1, groceries: 100 } }));

    expect(planner.income.cards).toEqual([]);
    expect(planner.expenses.cards.map((card) => card.category.id)).toEqual(["food"]);
  });
});
