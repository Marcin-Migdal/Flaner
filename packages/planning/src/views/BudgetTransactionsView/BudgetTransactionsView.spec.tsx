import { onlineManager } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirebaseError } from "firebase/app";
import { format } from "date-fns";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { toast } from "@flaner/shared/utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction, UnlockedBudget } from "../../api/budget";
import * as exchangeRatesApi from "../../api/exchangeRates";
import { BudgetProvider, useBudgetSession } from "../../context/BudgetContext";
import { BudgetTransactionsView } from "./BudgetTransactionsView";

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
  addBudgetTransaction: vi.fn(),
  deleteBudgetTransaction: vi.fn(),
}));
vi.mock("../../api/exchangeRates", () => ({ getExchangeRate: vi.fn() }));
vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  toast: { failure: vi.fn(), success: vi.fn(), message: vi.fn(), attention: vi.fn() },
}));

const i18n = createTestI18n({ en: { planning: en } });
const user = createMockUser({ uid: "user-1" });

const categories: BudgetCategoryTree = {
  expense: [
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: 1, subcategories: [{ id: "groceries", name: "Groceries" }] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 2, subcategories: [] }],
};
const account = (overrides: Partial<BudgetAccount> = {}): BudgetAccount => ({
  id: "main",
  name: "mBank",
  defaultCurrency: "PLN",
  hidden: false,
  createdAt: 1,
  ...overrides,
});
const tx = (overrides: Partial<BudgetTransaction>): BudgetTransaction => ({
  id: "t1",
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: 1250,
  currency: "PLN",
  amountMain: 1250,
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
  accounts = [account()],
  transactions = [],
}: { accounts?: BudgetAccount[]; transactions?: BudgetTransaction[] } = {}) => {
  vi.mocked(budgetApi.getBudgetProfile).mockResolvedValue({
    mainCurrency: "PLN",
    mainAccountId: "main",
    fileAccountMappings: {},
  });
  vi.mocked(budgetApi.getBudgetAccounts).mockResolvedValue(accounts);
  vi.mocked(budgetApi.getBudgetCategories).mockResolvedValue(categories);
  vi.mocked(budgetApi.getBudgetTransactions).mockResolvedValue(transactions);
  vi.mocked(budgetApi.addBudgetTransaction).mockImplementation(async (_, input) => ({ id: "new", ...input }));
  vi.mocked(budgetApi.deleteBudgetTransaction).mockResolvedValue(undefined);
};

// Stands in for the Budget gate: the page renders once the budget is unlocked
const Unlocked = ({ children }: { children: ReactNode }) => {
  const { budget: unlocked, setBudget } = useBudgetSession();
  useEffect(() => setBudget(budget), [setBudget]);
  return unlocked ? children : null;
};

const renderView = (entry = "/planning/budget/transactions?month=2026-11") =>
  renderWithProviders(
    <BudgetProvider>
      <Unlocked>
        <BudgetTransactionsView />
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, initialEntries: [entry], user },
  );

const openAddForm = async (userEvents: ReturnType<typeof userEvent.setup>) => {
  await userEvents.click(await screen.findByRole("button", { name: "Add transaction" }));
  return screen.findByRole("dialog", { name: "Add transaction" });
};

describe("BudgetTransactionsView", () => {
  beforeEach(() => setUp());
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.clearAllMocks();
  });

  it("opens the Transactions tab by default and the Recurring tab from #recurring", async () => {
    const userEvents = userEvent.setup();
    renderView("/planning/budget/transactions#recurring");

    expect(await screen.findByRole("heading", { level: 1, name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Recurring" })).toHaveAttribute("aria-selected", "true");

    await userEvents.click(screen.getByRole("tab", { name: "Transactions" }));
    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the month's totals and its rows, and loads another month from the arrows", async () => {
    setUp({
      transactions: [
        tx({ id: "a", payee: "Biedronka", amountMain: 1250 }),
        tx({ id: "b", payee: "Employer", type: "income", amount: 500000, amountMain: 500000, categoryId: "salary" }),
      ],
    });
    const userEvents = userEvent.setup();
    renderView();

    expect(await screen.findByText("Biedronka")).toBeInTheDocument();
    const totals = screen.getByText("Balance").closest("dl");
    if (!totals) throw new Error("totals missing");
    expect(within(totals).getByText("PLN 5,000.00")).toBeInTheDocument();
    expect(within(totals).getByText("-PLN 12.50")).toBeInTheDocument();
    expect(within(totals).getByText("PLN 4,987.50")).toBeInTheDocument();
    expect(budgetApi.getBudgetTransactions).toHaveBeenCalledWith(budget, { from: "2026-11", to: "2026-11" });

    await userEvents.click(screen.getByRole("button", { name: "Previous month" }));

    await waitFor(() =>
      expect(budgetApi.getBudgetTransactions).toHaveBeenCalledWith(budget, { from: "2026-10", to: "2026-10" }),
    );
    expect(screen.getByRole("button", { name: "Pick a month" })).toHaveTextContent("October 2026");
  });

  it("invites to add a transaction in an empty month", async () => {
    renderView();

    expect(await screen.findByRole("heading", { name: "No transactions yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add transaction" })).toBeEnabled();
    // No "-PLN 0.00" for an empty month
    const totals = screen.getByText("Expenses").closest("dl");
    expect(totals).not.toHaveTextContent("-");
  });

  it("adds a confirmed expense on the main account with the picked category", async () => {
    const userEvents = userEvent.setup();
    renderView();
    const dialog = await openAddForm(userEvents);

    await userEvents.type(within(dialog).getByRole("spinbutton", { name: "Amount" }), "12.5");
    await userEvents.type(within(dialog).getByLabelText("Payee"), "Biedronka");
    await userEvents.type(within(dialog).getByLabelText("Category"), "Groc");
    await userEvents.click(screen.getByRole("option", { name: "Groceries" }));
    // The only account cannot be changed
    expect(within(dialog).getByLabelText("Account")).toBeDisabled();
    await userEvents.click(within(dialog).getByRole("button", { name: "Add transaction" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const today = format(new Date(), "yyyy-MM-dd");
    expect(budgetApi.addBudgetTransaction).toHaveBeenCalledWith(budget, {
      accountId: "main",
      date: today,
      type: "expense",
      amount: 1250,
      currency: "PLN",
      amountMain: 1250,
      rate: 1,
      rateDate: today,
      rateOverridden: false,
      payee: "Biedronka",
      description: "",
      categoryId: "groceries",
      confirmed: true,
      excluded: false,
    });
  });

  it("clears the category when switching between Expense and Income, saving unconfirmed without one", async () => {
    const userEvents = userEvent.setup();
    renderView();
    const dialog = await openAddForm(userEvents);

    await userEvents.type(within(dialog).getByLabelText("Category"), "Groc");
    await userEvents.click(screen.getByRole("option", { name: "Groceries" }));
    await userEvents.click(within(dialog).getByRole("tab", { name: "Income" }));

    expect(within(dialog).getByText("Choose a category")).toBeInTheDocument();
    await userEvents.click(within(dialog).getByLabelText("Category"));
    expect(screen.getByRole("option", { name: "Salary" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Groceries" })).not.toBeInTheDocument();
    await userEvents.type(within(dialog).getByLabelText("Amount"), "100");
    await userEvents.type(within(dialog).getByLabelText("Payee"), "Employer");
    await userEvents.click(within(dialog).getByRole("button", { name: "Add transaction" }));

    await waitFor(() =>
      expect(budgetApi.addBudgetTransaction).toHaveBeenCalledWith(
        budget,
        expect.objectContaining({ type: "income", categoryId: null, confirmed: false }),
      ),
    );
  });

  it("converts a foreign-currency amount at the date's rate and keeps a typed override", async () => {
    setUp({ accounts: [account({ defaultCurrency: "EUR" })] });
    vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({ rate: 4.25, date: "2026-11-13" });
    const userEvents = userEvent.setup();
    renderView();
    const dialog = await openAddForm(userEvents);

    await userEvents.type(within(dialog).getByLabelText("Amount"), "20");
    expect(await within(dialog).findByText("Rate 4.25 from Nov 13, 2026")).toBeInTheDocument();
    const amountMain = within(dialog).getByLabelText("Amount in PLN");
    await waitFor(() => expect(amountMain).toHaveValue(85));
    expect(exchangeRatesApi.getExchangeRate).toHaveBeenCalledWith("EUR", "PLN", format(new Date(), "yyyy-MM-dd"));

    await userEvents.clear(amountMain);
    await userEvents.type(amountMain, "86.1");
    await userEvents.type(within(dialog).getByLabelText("Payee"), "Zalando");
    await userEvents.click(within(dialog).getByRole("button", { name: "Add transaction" }));

    await waitFor(() =>
      expect(budgetApi.addBudgetTransaction).toHaveBeenCalledWith(
        budget,
        expect.objectContaining({
          amount: 2000,
          currency: "EUR",
          amountMain: 8610,
          rate: 4.25,
          rateDate: "2026-11-13",
          rateOverridden: true,
        }),
      ),
    );
  });

  it("deletes a transaction only after confirmation", async () => {
    const row = tx({ id: "a", payee: "Biedronka" });
    setUp({ transactions: [row] });
    const userEvents = userEvent.setup();
    renderView();

    await userEvents.click(await screen.findByRole("button", { name: "Delete Biedronka" }));
    const confirm = screen.getByRole("dialog", { name: "Delete this transaction?" });
    expect(budgetApi.deleteBudgetTransaction).not.toHaveBeenCalled();
    await userEvents.click(within(confirm).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(budgetApi.deleteBudgetTransaction).toHaveBeenCalledWith(budget, row));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps a loaded month browsable offline, with a banner and writes disabled", async () => {
    setUp({ transactions: [tx({ payee: "Biedronka" })] });
    renderView();
    expect(await screen.findByText("Biedronka")).toBeInTheDocument();

    onlineManager.setOnline(false);

    expect(await screen.findByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText("Biedronka")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add transaction" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Biedronka" })).toBeDisabled();
  });

  it("says a month never opened is not available offline instead of showing it empty", async () => {
    const userEvents = userEvent.setup();
    renderView();
    expect(await screen.findByRole("heading", { name: "No transactions yet" })).toBeInTheDocument();

    onlineManager.setOnline(false);
    await userEvents.click(screen.getByRole("button", { name: "Previous month" }));

    expect(
      await screen.findByText("This month hasn't been opened on this device yet, so it isn't available offline."),
    ).toBeInTheDocument();
  });

  it("shows No connection with Retry when a save fails, and retries the save", async () => {
    vi.mocked(budgetApi.addBudgetTransaction).mockRejectedValueOnce(
      new FirebaseError("unavailable", "Failed to get document because the client is offline."),
    );
    const userEvents = userEvent.setup();
    renderView();
    const dialog = await openAddForm(userEvents);

    await userEvents.type(within(dialog).getByLabelText("Amount"), "5");
    await userEvents.type(within(dialog).getByLabelText("Payee"), "Kiosk");
    await userEvents.click(within(dialog).getByRole("button", { name: "Add transaction" }));

    await waitFor(() =>
      expect(toast.failure).toHaveBeenCalledWith("No connection. Your change was not saved.", {
        action: { label: "Retry", onClick: expect.any(Function) },
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const [, options] = vi.mocked(toast.failure).mock.calls[0];
    options?.action?.onClick();

    await waitFor(() => expect(budgetApi.addBudgetTransaction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
