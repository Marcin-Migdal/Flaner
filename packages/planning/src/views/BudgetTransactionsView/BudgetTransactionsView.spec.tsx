import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { BudgetTransactionsView } from "./BudgetTransactionsView";

const i18n = createTestI18n({
  en: {
    planning: {
      nav: { budgetTransactions: "Transactions" },
      budget: { transactions: { tabs: { transactions: "Transactions", recurring: "Recurring" } } },
    },
  },
});

const renderView = (entry: string) =>
  renderWithProviders(<BudgetTransactionsView />, { i18nInstance: i18n, initialEntries: [entry] });

describe("BudgetTransactionsView", () => {
  it("opens the Transactions tab by default", () => {
    renderView("/planning/budget/transactions");

    expect(screen.getByRole("heading", { level: 1, name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the Recurring tab from #recurring and switches tabs on click", async () => {
    const user = userEvent.setup();
    renderView("/planning/budget/transactions#recurring");

    expect(screen.getByRole("tab", { name: "Recurring" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Transactions" }));

    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute("aria-selected", "true");
  });
});
