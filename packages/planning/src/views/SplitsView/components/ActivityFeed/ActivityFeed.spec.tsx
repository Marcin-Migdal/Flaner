import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { Expense, Settlement, SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { ActivityFeed } from "./ActivityFeed";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const deleteExpenseMock = vi.fn().mockResolvedValue(undefined);
const deleteSettlementMock = vi.fn().mockResolvedValue(undefined);
const confirmSettlementMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../../hooks/api/mutation", () => ({
  useDeleteExpenseMutation: () => ({ mutateAsync: deleteExpenseMock, isPending: false }),
  useDeleteSettlementMutation: () => ({ mutateAsync: deleteSettlementMock, isPending: false }),
  useConfirmSettlementMutation: () => ({ mutateAsync: confirmSettlementMock, isPending: false }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: { EUR: 6000 },
  balances: {},
  pairBalances: {},
  expensesCount: 1,
  settlementsCount: 1,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
  { id: "user-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
];

const mockExpenses: Expense[] = [
  {
    id: "exp-1",
    groupId: "grp-1",
    title: "Gelato in Florence",
    amount: 1500,
    currency: "EUR",
    category: "food",
    paidBy: "user-1",
    splitType: "equally",
    splits: [
      { userId: "user-1", amount: 750 },
      { userId: "user-2", amount: 750 },
    ],
    date: "2026-08-12",
    createdBy: "user-1",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

const mockSettlements: Settlement[] = [
  {
    id: "stl-1",
    groupId: "grp-1",
    payerId: "user-2",
    receiverId: "user-1",
    amount: 750,
    currency: "EUR",
    note: "",
    status: "confirmed",
    date: "2026-08-13",
    createdBy: "user-2",
    createdAt: 1700000000000,
  },
];

describe("ActivityFeed", () => {
  it("renders empty state when there are no items", () => {
    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={[]}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    expect(screen.getByText("splits.feed.emptyExpensesTitle")).toBeInTheDocument();
  });

  it("renders expenses and settlements when expanded", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={mockExpenses}
        settlements={mockSettlements}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    expect(screen.getByText("Gelato in Florence")).toBeInTheDocument();

    const settlementsTrigger = screen.getByRole("button", { name: "splits.feed.settlements" });
    await user.click(settlementsTrigger);

    expect(await screen.findByText("splits.feed.settlementLabel")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    const { container } = renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={[]}
        isLoading={true}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
  });

  it("handles deleting an expense via confirmation popup", async () => {
    const user = userEvent.setup();
    deleteExpenseMock.mockImplementationOnce(async (_params, options) => {
      options?.onSuccess?.();
      return undefined;
    });

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={mockExpenses}
        settlements={[]}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);

    expect(screen.getByText("splits.feed.deleteExpenseTitle")).toBeInTheDocument();

    // Cancel first
    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.feed.deleteExpenseTitle")).not.toBeInTheDocument();

    // Reopen and confirm
    await user.click(deleteBtn);
    const expenseDialog = screen.getByRole("dialog");
    const confirmBtn = within(expenseDialog).getByRole("button", { name: "splits.actions.delete" });
    fireEvent.click(confirmBtn);

    expect(deleteExpenseMock).toHaveBeenCalledWith(
      { groupId: "grp-1", expenseId: "exp-1" },
      expect.any(Object),
    );
  });

  it("handles deleting a settlement via confirmation popup", async () => {
    const user = userEvent.setup();
    deleteSettlementMock.mockImplementationOnce(async (_params, options) => {
      options?.onSuccess?.();
      return undefined;
    });

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={mockSettlements}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    const settlementsTrigger = screen.getByRole("button", { name: "splits.feed.settlements" });
    await user.click(settlementsTrigger);

    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);

    expect(screen.getByText("splits.feed.deleteSettlementTitle")).toBeInTheDocument();

    const settlementDialog = screen.getByRole("dialog");
    const confirmSettlementBtn = within(settlementDialog).getByRole("button", { name: "splits.actions.delete" });
    fireEvent.click(confirmSettlementBtn);

    expect(deleteSettlementMock).toHaveBeenCalledWith(
      { groupId: "grp-1", settlementId: "stl-1" },
      expect.any(Object),
    );
  });

  it("filters expenses by search and resets filters when empty", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={mockExpenses}
        settlements={[]}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    // Open filter popover
    const filterBtn = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(filterBtn);

    // Type query that doesn't match
    const searchInput = screen.getByPlaceholderText("splits.filters.searchPlaceholder");
    await user.type(searchInput, "NoMatchAtAll");

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    // Empty filtered state shown
    expect(screen.getByText("splits.filters.noFilteredResults")).toBeInTheDocument();

    // Click clear filters button
    const clearBtn = screen.getByRole("button", { name: "splits.filters.reset" });
    await user.click(clearBtn);

    expect(screen.getByText("Gelato in Florence")).toBeInTheDocument();
  });

  it("triggers onEditExpense when clicking edit button", async () => {
    const user = userEvent.setup();
    const onEditMock = vi.fn();

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={mockExpenses}
        settlements={mockSettlements}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={onEditMock}
      />
    );

    const editBtn = screen.getByRole("button", { name: "splits.actions.edit" });
    await user.click(editBtn);

    expect(onEditMock).toHaveBeenCalledWith(mockExpenses[0]);
  });
});
