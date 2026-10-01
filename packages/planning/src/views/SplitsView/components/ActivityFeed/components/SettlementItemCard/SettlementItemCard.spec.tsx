import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { TooltipProvider } from "@flaner/ui-components";
import type { Settlement } from "../../../../../../api/splits";
import { SettlementItemCard } from "./SettlementItemCard";

const mockSettlementConfirmed: Settlement = {
  id: "stl-1",
  groupId: "grp-1",
  payerId: "user-1",
  receiverId: "user-2",
  amount: 2500,
  currency: "EUR",
  note: "",
  status: "confirmed",
  date: "2026-08-15",
  createdBy: "user-1",
  createdAt: 1700000000000,
};

const mockSettlementPending: Settlement = {
  id: "stl-2",
  groupId: "grp-1",
  payerId: "user-2",
  receiverId: "user-1",
  amount: 1500,
  currency: "EUR",
  note: "",
  status: "pending",
  date: "2026-08-16",
  createdBy: "user-2",
  createdAt: 1700000000000,
};

describe("SettlementItemCard", () => {
  it("renders confirmed settlement and handles delete", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    renderWithProviders(
      <TooltipProvider>
        <SettlementItemCard
          settlement={mockSettlementConfirmed}
          currentUserId="user-1"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onDelete={onDeleteMock}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("splits.feed.settlementLabel")).toBeInTheDocument();
    expect(screen.getByText("Alice → Bob")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("renders pending settlement with mark as paid confirm button for receiver", async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();

    renderWithProviders(
      <TooltipProvider>
        <SettlementItemCard
          settlement={mockSettlementPending}
          currentUserId="user-1"
          getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
          onDelete={vi.fn()}
          onConfirm={onConfirmMock}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("splits.settlements.pendingLabel")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(confirmBtn);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });
});
