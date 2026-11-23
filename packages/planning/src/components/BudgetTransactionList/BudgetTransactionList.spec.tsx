import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import { buildMonthLedger } from "../../utils/monthLedger";
import { BudgetTransactionList } from "./BudgetTransactionList";

const i18n = createTestI18n({
  en: {
    planning: {
      budget: { transactionList: { uncategorized: "Uncategorized", delete: "Delete {{payee}}" } },
    },
  },
});

const accounts: BudgetAccount[] = [
  { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  { id: "cash", name: "Cash", defaultCurrency: "PLN", hidden: false, createdAt: 2 },
];
const categories: BudgetCategoryTree = {
  expense: [
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: 1, subcategories: [{ id: "groceries", name: "Groceries" }] },
  ],
  income: [],
};

const tx = (overrides: Partial<BudgetTransaction>): BudgetTransaction => ({
  id: overrides.payee ?? "t",
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

const transactions = [
  tx({ payee: "Biedronka", date: "2026-11-03" }),
  tx({ payee: "Lidl", date: "2026-11-03", categoryId: null, accountId: "cash", description: "milk" }),
  tx({ payee: "Zalando", date: "2026-11-12", currency: "EUR", amount: 2000, amountMain: 8600 }),
];

const renderList = (onDelete?: (transaction: BudgetTransaction) => void) =>
  renderWithProviders(
    <BudgetTransactionList
      days={buildMonthLedger({ month: "2026-11", transactions, accounts }).days}
      categories={categories}
      accounts={accounts}
      mainCurrency="PLN"
      onDelete={onDelete}
    />,
    { i18nInstance: i18n },
  );

describe("BudgetTransactionList", () => {
  it("groups rows by day, newest first, with each day's net", () => {
    renderList();

    const [newest, older] = screen.getAllByRole("region");
    expect(within(newest).getByRole("heading")).toHaveTextContent("Thursday, November 12");
    expect(within(newest).getByRole("heading").parentElement).toHaveTextContent("-PLN 86.00");
    expect(within(older).getByRole("heading")).toHaveTextContent("Tuesday, November 3");
    expect(within(older).getByRole("heading").parentElement).toHaveTextContent("-PLN 25.00");
    expect(within(older).getAllByRole("listitem").map((row) => within(row).getByText(/Biedronka|Lidl/).textContent)).toEqual([
      "Lidl",
      "Biedronka",
    ]);
  });

  it("shows category, account and description, and Uncategorized for a row without a category", () => {
    renderList();

    expect(screen.getAllByText("Groceries · mBank")).toHaveLength(2);
    expect(screen.getByText("Uncategorized · Cash · milk")).toBeInTheDocument();
  });

  it("shows a foreign-currency amount with its main-currency amount", () => {
    renderList();

    const row = screen.getByText("Zalando").closest("li");
    if (!row) throw new Error("row missing");
    expect(within(row).getByText("-€20.00")).toBeInTheDocument();
    expect(within(row).getByText("-PLN 86.00")).toBeInTheDocument();
  });

  it("offers Delete on each row when asked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderList(onDelete);

    await user.click(screen.getByRole("button", { name: "Delete Lidl" }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ payee: "Lidl" }));
  });
});
