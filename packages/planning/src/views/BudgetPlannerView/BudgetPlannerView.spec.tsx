import { onlineManager } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { BudgetCategoryTree, BudgetPlan, BudgetTransaction, UnlockedBudget } from "../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../context/BudgetContext";
import { BudgetPlannerView } from "./BudgetPlannerView";

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
  setBudgetPlanAmount: vi.fn(),
}));
vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  toast: { failure: vi.fn(), success: vi.fn(), message: vi.fn(), attention: vi.fn() },
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
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 2, subcategories: [] }],
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
  payee: "Biedronka",
  description: "",
  categoryId,
  confirmed: true,
  excluded: false,
  ...overrides,
});

const setUp = ({ transactions = [], plan = null }: { transactions?: BudgetTransaction[]; plan?: BudgetPlan | null } = {}) => {
  vi.mocked(budgetApi.getBudgetProfile).mockResolvedValue({ mainCurrency: "PLN", mainAccountId: "main", fileAccountMappings: {} });
  vi.mocked(budgetApi.getBudgetAccounts).mockResolvedValue([
    { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  ]);
  vi.mocked(budgetApi.getBudgetCategories).mockResolvedValue(categories);
  vi.mocked(budgetApi.getBudgetTransactions).mockResolvedValue(transactions);
  vi.mocked(budgetApi.getBudgetPlan).mockResolvedValue(plan);
  vi.mocked(budgetApi.setBudgetPlanAmount).mockImplementation(async (_, { month }) => ({ month, limits: {}, plannedIncome: {} }));
};

const Unlocked = ({ children }: { children: ReactNode }) => {
  const { budget: unlocked, setBudget } = useBudgetSession();
  useEffect(() => setBudget(budget), [setBudget]);
  return unlocked ? children : null;
};

const renderView = () =>
  renderWithProviders(
    <BudgetProvider>
      <Unlocked>
        <BudgetPlannerView />
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, initialEntries: ["/planning/budget/planner?month=2026-11"], user },
  );

const plan = (overrides: Partial<BudgetPlan>): BudgetPlan => ({ month: "2026-11", limits: {}, plannedIncome: {}, ...overrides });

describe("BudgetPlannerView", () => {
  beforeEach(() => setUp());
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.clearAllMocks();
  });

  it("shows a card per planned category and everything else outside the plan", async () => {
    setUp({
      transactions: [tx("groceries", 42000), tx("coffee", 6400), tx(null, 1849)],
      plan: plan({ limits: { food: 150000, groceries: 100000 } }),
    });
    renderView();

    const card = await screen.findByRole("region", { name: "Food" });
    expect(within(card).getByRole("meter", { name: "Food" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/^PLN\s420\.00 of PLN\s1,500\.00$/),
    );
    expect(within(card).getByRole("spinbutton", { name: "Limit for Groceries" })).toHaveValue(1000);
    const outside = screen.getByRole("list", { name: "Outside the plan" });
    expect(within(outside).getByText("Coffee")).toBeInTheDocument();
    expect(within(outside).getByText("Uncategorized")).toBeInTheDocument();
    expect(within(outside).getByRole("link", { name: "Review in Transactions" })).toBeInTheDocument();
    expect(budgetApi.getBudgetPlan).toHaveBeenCalledWith(budget, "2026-11");
  });

  it("saves a limit typed into a line's inline field", async () => {
    setUp({ plan: plan({ limits: { groceries: 100000 } }) });
    const userEvents = userEvent.setup();
    renderView();

    const field = await screen.findByRole("spinbutton", { name: "Limit for Groceries" });
    await userEvents.clear(field);
    await userEvents.type(field, "1200.5{Enter}");

    await waitFor(() =>
      expect(budgetApi.setBudgetPlanAmount).toHaveBeenCalledWith(budget, {
        month: "2026-11",
        type: "expense",
        categoryId: "groceries",
        amount: 120050,
      }),
    );
  });

  it("puts the saved limit back in the field when saving fails", async () => {
    setUp({ plan: plan({ limits: { groceries: 100000 } }) });
    vi.mocked(budgetApi.setBudgetPlanAmount).mockRejectedValue(new Error("planning:errors.budget.keyChanged"));
    const userEvents = userEvent.setup();
    renderView();

    const field = await screen.findByRole("spinbutton", { name: "Limit for Groceries" });
    await userEvents.clear(field);
    await userEvents.type(field, "5{Enter}");

    await waitFor(() => expect(field).toHaveValue(1000));
  });

  it("adds a limit from Outside the plan, defaulting to what's spent", async () => {
    setUp({ transactions: [tx("coffee", 6400)] });
    const userEvents = userEvent.setup();
    renderView();

    const outside = await screen.findByRole("list", { name: "Outside the plan" });
    await userEvents.click(within(outside).getByRole("button", { name: "Add limit: Food / Coffee" }));
    const dialog = await screen.findByRole("dialog", { name: "Add limit" });
    expect(within(dialog).getByRole("spinbutton", { name: "Limit" })).toHaveValue(64);
    await userEvents.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(budgetApi.setBudgetPlanAmount).toHaveBeenCalledWith(budget, {
      month: "2026-11",
      type: "expense",
      categoryId: "coffee",
      amount: 6400,
    });
  });

  it("removes a limit from the details sheet", async () => {
    setUp({ plan: plan({ limits: { groceries: 100000 } }) });
    const userEvents = userEvent.setup();
    renderView();

    await userEvents.click(await screen.findByRole("button", { name: "Details of Groceries" }));
    const sheet = await screen.findByRole("dialog", { name: "Groceries" });
    await userEvents.click(within(sheet).getByRole("button", { name: "Remove limit" }));

    await waitFor(() =>
      expect(budgetApi.setBudgetPlanAmount).toHaveBeenCalledWith(budget, {
        month: "2026-11",
        type: "expense",
        categoryId: "groceries",
        amount: null,
      }),
    );
  });

  it("mirrors income with a Short of plan tag", async () => {
    setUp({
      transactions: [tx("salary", 500000, { type: "income" })],
      plan: plan({ plannedIncome: { salary: 845000 } }),
    });
    renderView();

    const card = await screen.findByRole("region", { name: "Salary" });
    expect(within(card).getByText("Short of plan · PLN 3,450.00")).toBeInTheDocument();
  });
});
