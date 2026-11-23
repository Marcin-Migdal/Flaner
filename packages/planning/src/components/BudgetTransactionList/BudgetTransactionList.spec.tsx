import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { useState } from "react";
import en from "../../../public/locales/en/planning.json";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import { buildMonthLedger } from "../../utils/monthLedger";
import { BudgetTransactionList, type BudgetTransactionListProps } from "./BudgetTransactionList";

let mockIsMobile = false;

vi.mock("@flaner/shared/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/hooks")>();
  return { ...actual, useIsMobile: () => mockIsMobile };
});

const i18n = createTestI18n({ en: { planning: en } });

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
  tx({ payee: "Lidl", date: "2026-11-03", categoryId: null, accountId: "cash", description: "milk", confirmed: false }),
  tx({ payee: "Zalando", date: "2026-11-12", currency: "EUR", amount: 2000, amountMain: 8600, rate: 4.3 }),
];

// Holds the selection like the view does
const SelectableList = (props: Omit<BudgetTransactionListProps, "selectedIds" | "onSelectionChange">) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  return <BudgetTransactionList {...props} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />;
};

const renderList = (props: Partial<BudgetTransactionListProps> = {}) =>
  renderWithProviders(
    <SelectableList
      days={buildMonthLedger({ month: "2026-11", transactions, accounts }).days}
      categories={categories}
      accounts={accounts}
      mainCurrency="PLN"
      {...props}
    />,
    { i18nInstance: i18n },
  );

const rowOf = (payee: string) => {
  const row = screen.getAllByRole("listitem").find((item) => within(item).queryByText(payee) ?? within(item).queryByDisplayValue(payee));
  if (!row) throw new Error(`row ${payee} missing`);
  return row;
};

afterEach(() => {
  mockIsMobile = false;
  vi.useRealTimers();
});

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

  it("read-only, shows category, account and description, and Uncategorized for a row without a category", () => {
    renderList();

    expect(screen.getAllByText("Groceries · mBank")).toHaveLength(2);
    expect(screen.getByText("Uncategorized · Cash")).toBeInTheDocument();
    expect(screen.getByText("milk")).toBeInTheDocument();
  });

  it("shows a foreign-currency amount with its main-currency amount", () => {
    renderList();

    const row = rowOf("Zalando");
    expect(within(row).getByText("-€20.00")).toBeInTheDocument();
    expect(within(row).getByText("-PLN 86.00")).toBeInTheDocument();
  });

  it("expands a row into date, account, source file and amount, with Edit and Delete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    renderList({ onDelete, onEdit });

    await user.click(screen.getByRole("button", { name: "Details of Zalando" }));
    const row = rowOf("Zalando");
    expect(within(row).getByText("Thursday, November 12, 2026")).toBeInTheDocument();
    expect(within(row).getByText("Added by hand")).toBeInTheDocument();
    expect(within(row).getByText("€20.00 = PLN 86.00 at the rate 4.3 from Nov 10, 2026")).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Edit" }));
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ payee: "Zalando" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ payee: "Zalando" }));
  });

  describe("on desktop, with onUpdate", () => {
    it("saves payee, description and amount edited in place; an empty payee or a bad amount reverts", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderList({ onUpdate });

      const payee = screen.getByDisplayValue("Lidl");
      await user.clear(payee);
      await user.type(payee, "Lidl Polska{Enter}");
      await user.type(screen.getByRole("textbox", { name: "Description of Biedronka" }), "weekly{Enter}");
      const amount = screen.getByRole("textbox", { name: "Amount of Zalando" });
      await user.clear(amount);
      await user.type(amount, "30,5{Enter}");

      expect(onUpdate.mock.calls).toEqual([
        [expect.objectContaining({ payee: "Lidl" }), { payee: "Lidl Polska" }],
        [expect.objectContaining({ payee: "Biedronka" }), { description: "weekly" }],
        // Converted at the stored rate
        [expect.objectContaining({ payee: "Zalando" }), { amount: 3050, amountMain: 13115 }],
      ]);

      onUpdate.mockClear();
      await user.clear(amount);
      await user.type(amount, "abc{Enter}");
      const biedronka = screen.getByDisplayValue("Biedronka");
      await user.clear(biedronka);
      await user.tab();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(amount).toHaveValue("20.00");
      expect(screen.getByDisplayValue("Biedronka")).toBeInTheDocument();
    });

    it("confirms a guessed category with one click on its icon", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderList({
        onUpdate,
        days: buildMonthLedger({ month: "2026-11", transactions: [tx({ confirmed: false })], accounts }).days,
      });

      await user.click(screen.getByRole("button", { name: "Confirm category Groceries" }));

      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ payee: "Biedronka" }), { confirmed: true });
    });

    it("shows read-only rows while actions are disabled", () => {
      renderList({ onUpdate: vi.fn(), actionsDisabled: true });

      expect(screen.queryByRole("textbox", { name: "Amount of Zalando" })).not.toBeInTheDocument();
    });
  });

  it("selects with Ctrl + click, Shift + click a range, or each row's checkbox", async () => {
    const user = userEvent.setup();
    renderList();
    const isSelected = (payee: string) => screen.getByRole("checkbox", { name: `Select ${payee}` });

    await user.keyboard("{Control>}");
    await user.click(within(rowOf("Zalando")).getByText("Zalando"));
    await user.keyboard("{/Control}");
    expect(isSelected("Zalando")).toBeChecked();

    await user.keyboard("{Shift>}");
    await user.click(within(rowOf("Biedronka")).getByText("Biedronka"));
    await user.keyboard("{/Shift}");
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(3);

    await user.click(isSelected("Lidl"));
    expect(isSelected("Lidl")).not.toBeChecked();
    expect(isSelected("Biedronka")).toBeChecked();
    // A selection click never expands the row
    expect(screen.queryByText("Source file")).not.toBeInTheDocument();
  });

  describe("on the phone", () => {
    it("shows plain rows that expand on tap", async () => {
      mockIsMobile = true;
      const user = userEvent.setup();
      renderList({ onUpdate: vi.fn() });

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Uncategorized · Cash · milk")).toBeInTheDocument();

      await user.click(screen.getByText("Lidl"));
      expect(within(rowOf("Lidl")).getByText("Source file")).toBeInTheDocument();
      // The expanded row holds the category picker
      expect(within(rowOf("Lidl")).getByLabelText("Category of Lidl")).toBeInTheDocument();
    });

    it("selects on a long-press, then toggles rows on tap", () => {
      mockIsMobile = true;
      vi.useFakeTimers();
      renderList();

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      const lidl = within(rowOf("Lidl")).getByRole("button");
      fireEvent.pointerDown(lidl);
      act(() => vi.advanceTimersByTime(500));
      fireEvent.pointerUp(lidl);
      fireEvent.click(lidl);
      expect(screen.getByRole("checkbox", { name: "Select Lidl" })).toBeChecked();

      fireEvent.click(within(rowOf("Biedronka")).getByText("Biedronka"));
      expect(screen.getByRole("checkbox", { name: "Select Biedronka" })).toBeChecked();
      expect(screen.queryByText("Source file")).not.toBeInTheDocument();
    });
  });
});
