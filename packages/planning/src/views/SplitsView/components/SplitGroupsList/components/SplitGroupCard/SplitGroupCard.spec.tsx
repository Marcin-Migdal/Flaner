import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../../../api/splits";
import { SplitGroupCard } from "./SplitGroupCard";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip 2026",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: { EUR: 200 },
  balances: {},
  pairBalances: {},
  expensesCount: 0,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SplitGroupCard", () => {
  it("renders group name, participant count, and settled label when no debts exist", () => {
    renderWithProviders(
      <SplitGroupCard
        group={mockGroup}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Eurotrip 2026")).toBeInTheDocument();
    expect(screen.getByText("splits.list.settled")).toBeInTheDocument();
  });

  it("calls onSelect when main card area is clicked", async () => {
    const user = userEvent.setup();
    const onSelectMock = vi.fn();

    renderWithProviders(
      <SplitGroupCard
        group={mockGroup}
        isActive={true}
        onSelect={onSelectMock}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Eurotrip 2026/i }));
    expect(onSelectMock).toHaveBeenCalledTimes(1);
  });

  it("renders owner action buttons and triggers onEdit and onDelete", async () => {
    const user = userEvent.setup();
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    renderWithProviders(
      <SplitGroupCard
        group={mockGroup}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
      />
    );

    const editBtn = screen.getByRole("button", { name: "splits.actions.edit" });
    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });

    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    await user.click(editBtn);
    expect(onEditMock).toHaveBeenCalledTimes(1);

    await user.click(deleteBtn);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("hides action buttons when user is not owner", () => {
    renderWithProviders(
      <SplitGroupCard
        group={{ ...mockGroup, createdBy: "other-user" }}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "splits.actions.edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "splits.actions.delete" })).not.toBeInTheDocument();
  });

  it("renders youAreOwed badge with simplified debts", () => {
    const simplifiedGroup: SplitGroup = {
      ...mockGroup,
      simplifyDebts: true,
      balances: { EUR: { "user-1": 5000, "user-2": -5000 } },
    };

    renderWithProviders(
      <SplitGroupCard
        group={simplifiedGroup}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/splits\.list\.youAreOwed/)).toBeInTheDocument();
  });

  it("renders youOwe badge with pairwise debts", () => {
    const owingGroup: SplitGroup = {
      ...mockGroup,
      simplifyDebts: false,
      pairBalances: { EUR: { "user-1__user-2": -3000 } },
    };

    renderWithProviders(
      <SplitGroupCard
        group={owingGroup}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/splits\.list\.youOwe/)).toBeInTheDocument();
  });

  it("renders correctly when user is unauthenticated", () => {
    mockUser = null;

    renderWithProviders(
      <SplitGroupCard
        group={mockGroup}
        isActive={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Eurotrip 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "splits.actions.edit" })).not.toBeInTheDocument();
    mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };
  });
});
