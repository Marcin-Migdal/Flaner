import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import type { BudgetCategoryTree, BudgetTransaction } from "../../../../api/budget";
import { BudgetBulkActions } from "./BudgetBulkActions";

const i18n = createTestI18n({ en: { planning: en } });

const categories: BudgetCategoryTree = {
  expense: [{ id: "shopping", name: "Shopping", icon: "shopping-bag", color: 1, subcategories: [] }],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 2, subcategories: [] }],
};

const tx = (id: string, type: BudgetTransaction["type"] = "expense"): BudgetTransaction => ({
  id,
  accountId: "main",
  date: "2026-11-10",
  type,
  amount: 1000,
  currency: "PLN",
  amountMain: 1000,
  rate: 1,
  rateDate: "2026-11-10",
  rateOverridden: false,
  payee: id,
  description: "",
  categoryId: null,
  confirmed: false,
  excluded: false,
});

const renderBar = (selected: BudgetTransaction[]) => {
  const onSetCategory = vi.fn().mockResolvedValue(undefined);
  const onExclude = vi.fn();
  const onRestore = vi.fn();
  renderWithProviders(
    <BudgetBulkActions
      selected={selected}
      categories={categories}
      onSetCategory={onSetCategory}
      onConfirm={vi.fn()}
      onExclude={onExclude}
      onRestore={onRestore}
      onDelete={vi.fn()}
      onClear={vi.fn()}
    />,
    { i18nInstance: i18n },
  );
  return { onSetCategory, onExclude, onRestore };
};

describe("BudgetBulkActions", () => {
  it("offers Exclude for relevant rows and Restore for excluded ones, never for a linked refund", async () => {
    const user = userEvent.setup();
    const linkedRefund: BudgetTransaction = {
      ...tx("refund", "income"),
      excluded: true,
      refundOf: { transactionId: "buy", accountId: "main", month: "2026-11", splitOffId: "s" },
    };
    const { onExclude, onRestore } = renderBar([tx("a"), { ...tx("b"), excluded: true }, linkedRefund]);

    await user.click(screen.getByRole("button", { name: "Exclude" }));
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(onExclude).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("hides Restore when only linked refunds are excluded", () => {
    const linkedRefund: BudgetTransaction = {
      ...tx("refund", "income"),
      excluded: true,
      refundOf: { transactionId: "buy", accountId: "main", month: "2026-11", splitOffId: "s" },
    };
    renderBar([linkedRefund]);
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exclude" })).not.toBeInTheDocument();
  });

  it("picks a category with the keyboard without closing the dialog, then sets it", async () => {
    const user = userEvent.setup();
    const { onSetCategory } = renderBar([tx("a"), tx("b")]);

    await user.click(screen.getByRole("button", { name: "Set category" }));
    const dialog = await screen.findByRole("dialog", { name: "Set the category of 2 transactions" });
    await user.type(within(dialog).getByLabelText("Category"), "Shopping{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onSetCategory).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Set category" }));
    expect(onSetCategory).toHaveBeenCalledWith("shopping");
  });

  it("offers Set category only for rows of one type", () => {
    renderBar([tx("a"), tx("b", "income")]);

    expect(screen.getByRole("button", { name: "Set category" })).toBeDisabled();
  });
});
