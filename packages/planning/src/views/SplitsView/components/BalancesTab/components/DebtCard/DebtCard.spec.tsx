import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { TooltipProvider } from "@flaner/ui-components";
import type { Debt } from "../../../../../../utils/debtSimplification";
import { DebtCard } from "./DebtCard";

const mockDebt: Debt = {
  from: "user-1",
  to: "user-2",
  amount: 2500,
  currency: "EUR",
};

describe("DebtCard", () => {
  it("renders participants and amount", () => {
    renderWithProviders(
      <TooltipProvider>
        <DebtCard
          debt={mockDebt}
          formattedAmount="€25.00"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onSettle={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("€25.00")[0]).toBeInTheDocument();
  });

  it("renders pay button and calls onSettle when actionType is pay", async () => {
    const user = userEvent.setup();
    const onSettleMock = vi.fn();

    renderWithProviders(
      <TooltipProvider>
        <DebtCard
          debt={mockDebt}
          formattedAmount="€25.00"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onSettle={onSettleMock}
          actionType="pay"
        />
      </TooltipProvider>
    );

    const payBtn = screen.getByRole("button", { name: "splits.actions.pay" });
    await user.click(payBtn);

    expect(onSettleMock).toHaveBeenCalledTimes(1);
  });

  it("renders markAsPaid button and calls onSettle when actionType is markAsPaid", async () => {
    const user = userEvent.setup();
    const onSettleMock = vi.fn();

    renderWithProviders(
      <TooltipProvider>
        <DebtCard
          debt={mockDebt}
          formattedAmount="€25.00"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onSettle={onSettleMock}
          actionType="markAsPaid"
        />
      </TooltipProvider>
    );

    const markBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markBtn);

    expect(onSettleMock).toHaveBeenCalledTimes(1);
  });

  it("renders markAsPaid button and calls onConfirmPending when pendingSettlement is present", async () => {
    const user = userEvent.setup();
    const onConfirmPendingMock = vi.fn();
    const mockPendingSettlement = {
      id: "set-1",
      groupId: "grp-1",
      payerId: "user-1",
      receiverId: "user-2",
      amount: 2500,
      currency: "EUR",
      date: "2026-08-10",
      note: "Settlement note",
      status: "pending" as const,
      createdBy: "user-1",
      createdAt: 100,
    };

    renderWithProviders(
      <TooltipProvider>
        <DebtCard
          debt={mockDebt}
          formattedAmount="€25.00"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onSettle={vi.fn()}
          onConfirmPending={onConfirmPendingMock}
          pendingSettlement={mockPendingSettlement}
          actionType="markAsPaid"
        />
      </TooltipProvider>,
    );

    const markBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markBtn);

    expect(onConfirmPendingMock).toHaveBeenCalledWith(mockPendingSettlement);
  });
});
