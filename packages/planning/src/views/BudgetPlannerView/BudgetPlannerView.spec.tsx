import { onlineManager } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { BudgetCategoryTree, BudgetPlan, BudgetRecurring, BudgetTransaction, UnlockedBudget } from "../../api/budget";
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
  getBudgetRecurring: vi.fn(),
  getLastBudgetPlanBefore: vi.fn(),
  startBudgetPlan: vi.fn(),
  dismissBudgetPlanRecurring: vi.fn(),
  linkBudgetRecurringOccurrence: vi.fn(),
  unlinkBudgetRecurringOccurrence: vi.fn(),
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

// Monthly on the 10th from January 2026, 120.00 expected
const recurringOn = (categoryId: string, overrides: Partial<BudgetRecurring> = {}): BudgetRecurring => ({
  id: `r-${categoryId}`,
  accountId: "main",
  type: "expense",
  payee: "Netflix",
  categoryId,
  amount: 12000,
  currency: "PLN",
  amountMain: 12000,
  rule: { pattern: { frequency: "monthly", interval: 1, day: 10 }, start: "2026-01-10", end: { type: "never" } },
  occurrences: {},
  createdAt: 1,
  ...overrides,
});

const setUp = ({
  transactions = [],
  plan = null,
  recurring = [],
  lastPlan = null,
}: {
  transactions?: BudgetTransaction[];
  plan?: BudgetPlan | null;
  recurring?: BudgetRecurring[];
  lastPlan?: BudgetPlan | null;
} = {}) => {
  vi.mocked(budgetApi.getBudgetRecurring).mockResolvedValue(recurring);
  vi.mocked(budgetApi.getLastBudgetPlanBefore).mockResolvedValue(lastPlan);
  vi.mocked(budgetApi.startBudgetPlan).mockImplementation(async (_, started) => started);
  vi.mocked(budgetApi.dismissBudgetPlanRecurring).mockImplementation(async (_, { month }) => ({
    month,
    limits: {},
    plannedIncome: {},
  }));
  vi.mocked(budgetApi.linkBudgetRecurringOccurrence).mockResolvedValue();
  vi.mocked(budgetApi.unlinkBudgetRecurringOccurrence).mockResolvedValue();
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

  it("shows recurring paid / expected on cards and lines, and recurring without a limit outside the plan", async () => {
    setUp({
      plan: plan({ limits: { food: 150000, groceries: 100000 } }),
      recurring: [
        recurringOn("groceries", {
          occurrences: { "2026-11-10": { transactionId: "t-paid", date: "2026-11-10", amount: 9000, amountMain: 9000 } },
        }),
        recurringOn("coffee", { id: "r-coffee", payee: "Coffee club" }),
      ],
    });
    renderView();

    const card = await screen.findByRole("region", { name: "Food" });
    expect(
      within(card).getByRole("group", { name: /^Recurring: PLN\s90\.00 paid of PLN\s90\.00 expected$/ }),
    ).toBeInTheDocument();
    expect(within(card).getByRole("note", { name: /^Recurring: PLN\s90\.00 paid of PLN\s90\.00 expected$/ })).toBeInTheDocument();
    const outside = screen.getByRole("list", { name: "Outside the plan" });
    expect(within(outside).getByText("Coffee")).toBeInTheDocument();
    expect(within(outside).getByText(/^Recurring PLN\s120\.00$/)).toBeInTheDocument();
  });

  it("adds a limit from Outside the plan, defaulting to the expected recurring when it is higher than spent", async () => {
    setUp({ transactions: [tx("coffee", 6400)], plan: plan({}), recurring: [recurringOn("coffee")] });
    const userEvents = userEvent.setup();
    renderView();

    const outside = await screen.findByRole("list", { name: "Outside the plan" });
    await userEvents.click(within(outside).getByRole("button", { name: "Add limit: Food / Coffee" }));
    const dialog = await screen.findByRole("dialog", { name: "Add limit" });
    expect(within(dialog).getByRole("spinbutton", { name: "Limit" })).toHaveValue(120);
    expect(within(dialog).getByText(/Already spent this month: PLN\s64\.00/)).toBeInTheDocument();
  });

  it("warns in the details sheet when the limit is below this month's recurring, and sets it to the sum", async () => {
    setUp({ plan: plan({ limits: { groceries: 10000 } }), recurring: [recurringOn("groceries")] });
    const userEvents = userEvent.setup();
    renderView();

    await userEvents.click(await screen.findByRole("button", { name: "Details of Groceries" }));
    const sheet = await screen.findByRole("dialog", { name: "Groceries" });
    expect(within(sheet).getByText(/The limit is below this month's recurring \(PLN\s120\.00\)/)).toBeInTheDocument();
    await userEvents.click(within(sheet).getByRole("button", { name: /^Set to PLN\s120\.00$/ }));

    await waitFor(() =>
      expect(budgetApi.setBudgetPlanAmount).toHaveBeenCalledWith(budget, {
        month: "2026-11",
        type: "expense",
        categoryId: "groceries",
        amount: 12000,
      }),
    );
  });

  it("links an unpaid occurrence to the nearest transaction and unlinks a paid one", async () => {
    const near = tx("groceries", 11900, { date: "2026-11-12", payee: "Netflix.com" });
    const far = tx("groceries", 5000, { date: "2026-11-28", payee: "Shop" });
    const unpaid = recurringOn("groceries");
    const paid = recurringOn("groceries", {
      id: "r-paid",
      payee: "Spotify",
      occurrences: { "2026-11-10": { transactionId: "t-old", date: "2026-11-10", amount: 2399, amountMain: 2399 } },
    });
    setUp({ transactions: [far, near], plan: plan({ limits: { groceries: 100000 } }), recurring: [unpaid, paid] });
    const userEvents = userEvent.setup();
    renderView();

    await userEvents.click(await screen.findByRole("button", { name: "Details of Groceries" }));
    const sheet = await screen.findByRole("dialog", { name: "Groceries" });
    await userEvents.click(within(sheet).getByRole("button", { name: "Recurring this month (2)" }));
    await userEvents.click(within(sheet).getByRole("button", { name: /^Link Netflix due/ }));

    const dialog = await screen.findByRole("dialog", { name: "Link Netflix" });
    const options = within(dialog).getAllByRole("button", { name: /^Link .+ of / });
    expect(options.map((option) => option.getAttribute("aria-label"))).toEqual([
      expect.stringMatching(/^Link Netflix\.com of/),
      expect.stringMatching(/^Link Shop of/),
    ]);
    await userEvents.click(options[0]);
    await waitFor(() =>
      expect(budgetApi.linkBudgetRecurringOccurrence).toHaveBeenCalledWith(budget, unpaid, {
        dueDate: "2026-11-10",
        transaction: near,
      }),
    );

    await userEvents.click(within(sheet).getByRole("button", { name: /^Unlink Spotify due/ }));
    await waitFor(() =>
      expect(budgetApi.unlinkBudgetRecurringOccurrence).toHaveBeenCalledWith(budget, paid, "2026-11-10"),
    );
  });

  it("starts an empty month from the last planned month, listing and adding the limits recurring adds", async () => {
    setUp({
      recurring: [recurringOn("coffee")],
      lastPlan: plan({ month: "2026-09", limits: { groceries: 100000 }, plannedIncome: { salary: 845000 } }),
    });
    const userEvents = userEvent.setup();
    renderView();

    const start = await screen.findByRole("region", { name: "Start planning November 2026" });
    expect(within(start).getAllByText(/^Food \/ Coffee · PLN\s120\.00$/)).toHaveLength(2);
    await userEvents.click(within(start).getByRole("button", { name: "Copy from September 2026" }));

    await waitFor(() =>
      expect(budgetApi.startBudgetPlan).toHaveBeenCalledWith(budget, {
        month: "2026-11",
        limits: { groceries: 100000, coffee: 12000 },
        plannedIncome: { salary: 845000 },
      }),
    );
    expect(budgetApi.getLastBudgetPlanBefore).toHaveBeenCalledWith(budget, "2026-11");
  });

  it("starts empty with only the prefill limits, and offers no copy without an earlier plan", async () => {
    setUp({ recurring: [recurringOn("coffee")] });
    const userEvents = userEvent.setup();
    renderView();

    const start = await screen.findByRole("region", { name: "Start planning November 2026" });
    expect(within(start).queryByRole("button", { name: /^Copy from/ })).not.toBeInTheDocument();
    await userEvents.click(within(start).getByRole("button", { name: "Start empty" }));

    await waitFor(() =>
      expect(budgetApi.startBudgetPlan).toHaveBeenCalledWith(budget, {
        month: "2026-11",
        limits: { coffee: 12000 },
        plannedIncome: {},
      }),
    );
  });

  it("shows a missing-limit banner in a planned month with Create limit and Dismiss", async () => {
    setUp({ plan: plan({ limits: { groceries: 100000 } }), recurring: [recurringOn("coffee")] });
    const userEvents = userEvent.setup();
    renderView();

    expect(await screen.findByText("Netflix has no limit in November 2026")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^Start planning/ })).not.toBeInTheDocument();
    await userEvents.click(screen.getByRole("button", { name: "Create limit for Netflix" }));
    const dialog = await screen.findByRole("dialog", { name: "Add limit" });
    expect(within(dialog).getByRole("spinbutton", { name: "Limit" })).toHaveValue(120);
    await userEvents.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await userEvents.click(screen.getByRole("button", { name: "Dismiss Netflix for this month" }));
    await waitFor(() =>
      expect(budgetApi.dismissBudgetPlanRecurring).toHaveBeenCalledWith(budget, { month: "2026-11", recurringId: "r-coffee" }),
    );
  });

  it("hides a banner dismissed in this month's plan", async () => {
    setUp({ plan: plan({ dismissedRecurring: ["r-coffee"] }), recurring: [recurringOn("coffee")] });
    renderView();

    expect(await screen.findByRole("list", { name: "Outside the plan" })).toBeInTheDocument();
    expect(screen.queryByText("Netflix has no limit in November 2026")).not.toBeInTheDocument();
  });
});
