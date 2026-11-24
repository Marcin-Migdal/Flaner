import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import * as budgetApi from "../../../../api/budget";
import type { BudgetAccount, UnlockedBudget } from "../../../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../../../context/BudgetContext";
import { BudgetAccountsSection } from "./BudgetAccountsSection";

vi.mock("../../../../api/budget", () => ({
  getLockedBudget: vi.fn(),
  getBudgetProfile: vi.fn(),
  getBudgetAccounts: vi.fn(),
  getBudgetAccountsWithTransactions: vi.fn(),
  countBudgetAccountTransactions: vi.fn(),
  addBudgetAccount: vi.fn(),
  updateBudgetAccount: vi.fn(),
  setMainBudgetAccount: vi.fn(),
  setBudgetMainCurrency: vi.fn(),
  deleteBudgetAccount: vi.fn(),
}));

const i18n = createTestI18n({ en: { planning: en } });

let budget: UnlockedBudget;
beforeAll(async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  budget = { uid: "user-1", keyId: "key-1", userKey };
});

const account = (id: string, name: string, overrides: Partial<BudgetAccount> = {}): BudgetAccount => ({
  id,
  name,
  defaultCurrency: "PLN",
  hidden: false,
  createdAt: 1,
  ...overrides,
});

const setUp = ({ withTransactions = [] }: { withTransactions?: string[] } = {}) => {
  vi.mocked(budgetApi.getBudgetProfile).mockResolvedValue({
    mainCurrency: "PLN",
    mainAccountId: "main",
    fileAccountMappings: {},
  });
  vi.mocked(budgetApi.getBudgetAccounts).mockResolvedValue([
    account("savings", "Savings", { hidden: true }),
    account("cash", "cash"),
    account("main", "mBank"),
  ]);
  vi.mocked(budgetApi.getBudgetAccountsWithTransactions).mockResolvedValue(withTransactions);
  vi.mocked(budgetApi.countBudgetAccountTransactions).mockResolvedValue(3);
  vi.mocked(budgetApi.addBudgetAccount).mockImplementation(async (_, input) => ({
    id: "new",
    ...input,
    hidden: false,
    createdAt: 2,
  }));
};

// Stands in for the Budget gate: the section renders once the budget is unlocked
const Unlocked = ({ children }: { children: ReactNode }) => {
  const { budget: unlocked, setBudget } = useBudgetSession();
  useEffect(() => setBudget(budget), [setBudget]);
  return unlocked ? children : null;
};

const renderSection = async () => {
  renderWithProviders(
    <BudgetProvider>
      <Unlocked>
        <BudgetAccountsSection />
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  await screen.findByRole("heading", { name: "Accounts" });
  return userEvent.setup();
};


const openMenu = async (events: ReturnType<typeof userEvent.setup>, name: string) => {
  await events.click(screen.getByRole("button", { name: `Actions for ${name}` }));
  return screen.findByRole("menu");
};

describe("BudgetAccountsSection", () => {
  beforeEach(() => setUp());
  afterEach(() => vi.clearAllMocks());

  it("lists the main account first, then the rest alphabetically, marking main and hidden", async () => {
    await renderSection();

    const [main, cash, savings] = screen.getAllByRole("listitem");
    expect(main).toHaveTextContent(/^mBankMainPLN$/);
    expect(cash).toHaveTextContent(/^cashPLN$/);
    expect(savings).toHaveTextContent(/^SavingsHiddenPLN$/);
  });

  it("offers the main account only Edit; another account can be made main, hidden or deleted", async () => {
    const events = await renderSection();

    let menu = await openMenu(events, "mBank");
    expect(within(menu).getAllByRole("menuitem").map(({ textContent }) => textContent)).toEqual(["Edit"]);
    await events.keyboard("{Escape}");

    menu = await openMenu(events, "cash");
    expect(within(menu).getAllByRole("menuitem").map(({ textContent }) => textContent)).toEqual([
      "Edit",
      "Make main",
      "Hide",
      "Delete",
    ]);
    await events.click(within(menu).getByRole("menuitem", { name: "Make main" }));
    await waitFor(() => expect(budgetApi.setMainBudgetAccount).toHaveBeenCalledWith(budget, "cash"));
  });

  it("shows a hidden account again, and never offers to make it main", async () => {
    const events = await renderSection();

    const menu = await openMenu(events, "Savings");
    expect(within(menu).queryByRole("menuitem", { name: "Make main" })).not.toBeInTheDocument();
    await events.click(within(menu).getByRole("menuitem", { name: "Show" }));

    await waitFor(() =>
      expect(budgetApi.updateBudgetAccount).toHaveBeenCalledWith(budget, "savings", { hidden: false }),
    );
  });

  it("deletes after a confirmation with the transaction count, or hides instead", async () => {
    const events = await renderSection();

    await events.click(within(await openMenu(events, "cash")).getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete cash?" });
    expect(await within(dialog).findByText("cash and its 3 transactions will be deleted. This can't be undone.")).toBeInTheDocument();

    await events.click(within(dialog).getByRole("button", { name: "Hide instead" }));
    await waitFor(() => expect(budgetApi.updateBudgetAccount).toHaveBeenCalledWith(budget, "cash", { hidden: true }));
    expect(budgetApi.deleteBudgetAccount).not.toHaveBeenCalled();

    await events.click(within(await openMenu(events, "cash")).getByRole("menuitem", { name: "Delete" }));
    const again = await screen.findByRole("dialog", { name: "Delete cash?" });
    await events.click(await within(again).findByRole("button", { name: "Delete account", hidden: false }));
    await waitFor(() => expect(budgetApi.deleteBudgetAccount).toHaveBeenCalledWith(budget, "cash"));
  });

  it("adds an account in the main currency by default", async () => {
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Add account" }));
    const dialog = await screen.findByRole("dialog", { name: "Add account" });
    await events.type(within(dialog).getByLabelText("Account name"), "  Revolut ");
    await events.click(within(dialog).getByRole("button", { name: "Add account" }));

    await waitFor(() =>
      expect(budgetApi.addBudgetAccount).toHaveBeenCalledWith(budget, { name: "Revolut", defaultCurrency: "PLN" }),
    );
  });

  it("locks an account's currency and the main currency once transactions exist", async () => {
    setUp({ withTransactions: ["cash"] });
    const events = await renderSection();

    await waitFor(() =>
      expect(screen.getByText("All totals are shown in this currency. It is locked because transactions exist.")).toBeInTheDocument(),
    );
    await events.click(within(await openMenu(events, "cash")).getByRole("menuitem", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit account" });
    expect(within(dialog).getByText("The currency can't be changed once the account has transactions.")).toBeInTheDocument();
  });

  it("lets the main currency change before the first transaction", async () => {
    await renderSection();

    expect(
      await screen.findByText("All totals are shown in this currency. You can change it until the first transaction."),
    ).toBeInTheDocument();
  });
});
