import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type {
  BudgetCategoryTree,
  BudgetPlan,
  BudgetRecurring,
  BudgetTransaction,
  UnlockedBudget,
} from "../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../context/BudgetContext";
import { BudgetSummaryView } from "./BudgetSummaryView";

let budget: UnlockedBudget;
beforeAll(async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  budget = { uid: "user-1", keyId: "key-1", userKey };
});

vi.mock("../../api/budget", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/budget")>()),
  getBudgetProfile: vi.fn(),
  getBudgetAccounts: vi.fn(),
  getBudgetCategories: vi.fn(),
  getBudgetTransactions: vi.fn(),
  getBudgetPlan: vi.fn(),
  getBudgetRecurring: vi.fn(),
}));

const i18n = createTestI18n({ en: { planning: en } });
const user = createMockUser({ uid: "user-1" });

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "food",
      name: "Food",
      icon: "utensils",
      color: 1,
      subcategories: [
        { id: "groceries", name: "Groceries" },
        { id: "coffee", name: "Coffee" },
      ],
    },
    { id: "home", name: "Home", icon: "house", color: 2, subcategories: [] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
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
  payee: "Biedronka",
  description: "",
  categoryId: "groceries",
  confirmed: true,
  excluded: false,
  ...overrides,
});

const setUp = ({
  transactions = [],
  plan = null,
  recurring = [],
}: { transactions?: BudgetTransaction[]; plan?: BudgetPlan | null; recurring?: BudgetRecurring[] } = {}) => {
  vi.mocked(budgetApi.getBudgetProfile).mockResolvedValue({ mainCurrency: "PLN", mainAccountId: "main", fileAccountMappings: {} });
  vi.mocked(budgetApi.getBudgetAccounts).mockResolvedValue([
    { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  ]);
  vi.mocked(budgetApi.getBudgetCategories).mockResolvedValue(categories);
  // One query per month: each gets its own month's rows
  vi.mocked(budgetApi.getBudgetTransactions).mockImplementation(async (_, { from }) =>
    transactions.filter((transaction) => transaction.date.startsWith(from)),
  );
  vi.mocked(budgetApi.getBudgetPlan).mockResolvedValue(plan);
  vi.mocked(budgetApi.getBudgetRecurring).mockResolvedValue(recurring);
};

const Unlocked = ({ children }: { children: ReactNode }) => {
  const { budget: unlocked, setBudget } = useBudgetSession();
  useEffect(() => setBudget(budget), [setBudget]);
  return unlocked ? children : null;
};

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
};

const renderView = () =>
  renderWithProviders(
    <BudgetProvider>
      <Unlocked>
        <Routes>
          <Route path="/planning/budget">
            <Route path="summary" element={<BudgetSummaryView />} />
            <Route path="transactions" element={<LocationProbe />} />
            <Route path="planner" element={<LocationProbe />} />
          </Route>
        </Routes>
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, initialEntries: ["/planning/budget/summary?month=2026-11"], user },
  );


describe("BudgetSummaryView", () => {
  beforeEach(() => setUp());
  afterEach(() => vi.clearAllMocks());

  it("ranks categories, drills into subcategories and opens a subcategory's transactions", async () => {
    setUp({
      transactions: [
        tx({ categoryId: "groceries", amountMain: 30000 }),
        tx({ categoryId: "coffee", amountMain: 5000 }),
        tx({ categoryId: "home", amountMain: 20000 }),
      ],
    });
    renderView();

    const list = await screen.findByRole("list", { name: "Categories by spending" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Food"),
      expect.stringContaining("Home"),
    ]);

    await userEvent.click(within(list).getByRole("button", { name: /Food/ }));
    const drilled = screen.getByRole("list", { name: "Food" });
    expect(within(drilled).getAllByRole("button").map((row) => row.textContent)).toEqual([
      expect.stringContaining("Groceries"),
      expect.stringContaining("Coffee"),
    ]);
    expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument();

    await userEvent.click(within(drilled).getByRole("button", { name: /Coffee/ }));
    expect(screen.getByRole("status", { name: "location" })).toHaveTextContent(
      "/planning/budget/transactions?month=2026-11&categories=coffee&direction=expense",
    );
  });

  it("shows month totals with the change against the previous month", async () => {
    setUp({
      transactions: [
        tx({ date: "2026-10-05", amountMain: 10000 }),
        tx({ date: "2026-11-05", amountMain: 25000 }),
        tx({ date: "2026-11-06", type: "income", categoryId: "salary", amountMain: 500000 }),
      ],
    });
    renderView();

    const card = (await screen.findByRole("heading", { name: "Month totals" })).closest("[data-slot=card]");
    if (!(card instanceof HTMLElement)) throw new Error("no totals card");
    expect(within(card).getByText(/^Up PLN\s150\.00 vs October$/)).toBeInTheDocument();
    expect(within(card).getByText(/^Up PLN\s5,000\.00 vs October$/)).toBeInTheDocument();
    expect(within(card).getByText(/^Up PLN\s4,850\.00 vs October$/)).toBeInTheDocument();
  });

  it("shows plan progress and the to-review count linking to unconfirmed transactions", async () => {
    setUp({
      transactions: [
        tx({ categoryId: "food", amountMain: 12000 }),
        tx({ categoryId: "home", amountMain: 3000, confirmed: false }),
        tx({ categoryId: null, amountMain: 1000, confirmed: false }),
      ],
      plan: { month: "2026-11", limits: { food: 10000 }, plannedIncome: {} },
    });
    renderView();

    // All of the month's expenses against the sum of limits, as the Planner header
    expect(await screen.findByRole("meter", { name: "Expenses against limits" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/^PLN\s160\.00 of PLN\s100\.00$/),
    );
    const limits = screen.getByRole("list", { name: "Limits" });
    expect(within(limits).getByRole("meter", { name: "Food" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/^PLN\s120\.00 of PLN\s100\.00$/),
    );
    expect(within(limits).getByText(/^Over by PLN\s20\.00$/)).toBeInTheDocument();
    expect(screen.getByText("2 transactions to review")).toBeInTheDocument();
    expect(screen.getByText("2 unconfirmed · 1 uncategorized")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Review in Transactions" }));
    expect(screen.getByRole("status", { name: "location" })).toHaveTextContent(
      "/planning/budget/transactions?month=2026-11&status=unconfirmed",
    );
  });

  it("shows the 12 months of income vs expenses ending on the chosen month", async () => {
    setUp({ transactions: [tx({ date: "2025-12-03", amountMain: 7000 }), tx({ amountMain: 2000 })] });
    renderView();

    const chart = await screen.findByRole("graphics-document", { name: /^Income vs expenses/ });
    expect(within(chart).getAllByRole("graphics-object")).toHaveLength(12);
    expect(screen.getByText(/^November 2026: income PLN\s0\.00 · expenses PLN\s20\.00$/)).toBeInTheDocument();
  });

  it("lists this month's recurring occurrences with N of M done and the amount still expected", async () => {
    const rule = (day: number) => ({
      pattern: { frequency: "monthly" as const, interval: 1, day },
      start: "2026-01-01",
      end: { type: "never" as const },
    });
    const recurring = (overrides: Partial<BudgetRecurring>): BudgetRecurring => ({
      id: "rec",
      accountId: "main",
      type: "expense",
      payee: "Netflix",
      categoryId: "home",
      amount: 4500,
      currency: "PLN",
      amountMain: 4500,
      rule: rule(28),
      occurrences: {},
      createdAt: 1,
      ...overrides,
    });
    setUp({
      recurring: [
        recurring({
          id: "rent",
          payee: "Rent",
          rule: rule(1),
          occurrences: { "2026-11-01": { transactionId: "t", date: "2026-11-01", amount: 200000, amountMain: 200000 } },
        }),
        recurring({ id: "netflix" }),
      ],
    });
    renderView();

    expect(await screen.findByText(/^1 of 2 done · -PLN\s45\.00 still expected$/)).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
  });
});
