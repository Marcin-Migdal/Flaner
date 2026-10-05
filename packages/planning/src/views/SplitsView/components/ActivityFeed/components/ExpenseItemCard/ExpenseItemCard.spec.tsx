import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { TooltipProvider } from "@flaner/ui-components";
import type { Expense } from "../../../../../../api/splits";
import { ExpenseItemCard } from "./ExpenseItemCard";

const mockExpensePaidByMe: Expense = {
  id: "exp-1",
  groupId: "grp-1",
  title: "Dinner in Rome",
  amount: 6000,
  currency: "EUR",
  category: "food",
  paidBy: "user-1",
  splitType: "equally",
  splits: [
    { userId: "user-1", amount: 3000 },
    { userId: "user-2", amount: 3000 },
  ],
  date: "2026-08-10",
  createdBy: "user-1",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockExpensePaidByOther: Expense = {
  id: "exp-2",
  groupId: "grp-1",
  title: "Museum Tickets",
  amount: 4000,
  currency: "EUR",
  category: "entertainment",
  paidBy: "user-2",
  splitType: "equally",
  splits: [
    { userId: "user-1", amount: 2000 },
    { userId: "user-2", amount: 2000 },
  ],
  date: "2026-08-11",
  createdBy: "user-2",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("ExpenseItemCard", () => {
  it("renders expense paid by current user with lent amount and action buttons", async () => {
    const user = userEvent.setup();
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    renderWithProviders(
      <TooltipProvider>
        <ExpenseItemCard
          expense={mockExpensePaidByMe}
          currentUserId="user-1"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onEdit={onEditMock}
          onDelete={onDeleteMock}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Dinner in Rome")).toBeInTheDocument();
    expect(screen.getByText("splits.feed.youPaid")).toBeInTheDocument();
    expect(screen.getByText("splits.feed.youLentLabel")).toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: "splits.actions.edit" });
    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });

    await user.click(editBtn);
    expect(onEditMock).toHaveBeenCalledTimes(1);

    await user.click(deleteBtn);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("renders expense paid by another user with borrowed amount and hides actions for non-creator", () => {
    renderWithProviders(
      <TooltipProvider>
        <ExpenseItemCard
          expense={mockExpensePaidByOther}
          currentUserId="user-1"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Museum Tickets")).toBeInTheDocument();
    expect(screen.getByText("splits.feed.paidBy")).toBeInTheDocument();
    expect(screen.getByText("splits.feed.youBorrowedLabel")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "splits.actions.edit" })).not.toBeInTheDocument();
  });

  it("renders expense where user is not involved", () => {
    renderWithProviders(
      <TooltipProvider>
        <ExpenseItemCard
          expense={mockExpensePaidByOther}
          currentUserId="user-3"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("splits.feed.notInvolved")).toBeInTheDocument();
  });

  it("renders conversion tooltip when conversion is present and displays actions when createdBy is empty", () => {
    const expenseWithConversion: Expense = {
      ...mockExpensePaidByMe,
      createdBy: "",
      paidBy: "user-1",
      conversion: {
        originalAmount: 1000,
        originalCurrency: "USD",
        targetCurrency: "EUR",
        rate: 0.92,
        rateDate: "2026-08-10",
      },
    };

    renderWithProviders(
      <TooltipProvider>
        <ExpenseItemCard
          expense={expenseWithConversion}
          currentUserId="user-1"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText(/splits\.conversion\.original/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "splits.actions.edit" })).toBeInTheDocument();
  });
});
