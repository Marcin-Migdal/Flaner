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
  useConfirmSettlementMutation: () => ({
    mutate: confirmSettlementMock,
    mutateAsync: confirmSettlementMock,
    isPending: false,
  }),
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
  expensesCount: 2,
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
  {
    id: "exp-2",
    groupId: "grp-1",
    title: "Taxi ride",
    amount: 2000,
    currency: "EUR",
    category: "transport",
    paidBy: "user-2",
    splitType: "equally",
    splits: [
      { userId: "user-1", amount: 1000 },
      { userId: "user-2", amount: 1000 },
    ],
    date: "2026-08-15",
    createdBy: "user-2",
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
    const editBtn = screen.getAllByRole("button", { name: "splits.actions.edit" })[0];
    await user.click(editBtn);

    expect(onEditMock).toHaveBeenCalledWith(mockExpenses[0]);
  });

  it("confirms a pending settlement when mark as paid is clicked", async () => {
    const user = userEvent.setup();
    const pendingSettlement: Settlement = {
      id: "stl-pending",
      groupId: "grp-1",
      payerId: "user-2",
      receiverId: "user-1",
      amount: 500,
      currency: "EUR",
      date: "2026-08-12",
      note: "",
      status: "pending",
      createdBy: "user-2",
      createdAt: 1700000000000,
    };

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={[pendingSettlement]}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    const settlementsTrigger = screen.getByRole("button", { name: /splits\.feed\.settlements/ });
    await user.click(settlementsTrigger);

    const markPaidBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markPaidBtn);

    expect(confirmSettlementMock).toHaveBeenCalledWith({
      groupId: "grp-1",
      settlementId: "stl-pending",
      expectedVersion: undefined,
    });
  });

  it("filters expenses by category, payer, and scope", async () => {
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

    // Filter by category: food
    const categorySelect = screen.getByLabelText("splits.filters.category");
    await user.selectOptions(categorySelect, "food");

    // Filter by payer: user-1
    const payerSelect = screen.getByLabelText("splits.filters.payer");
    await user.selectOptions(payerSelect, "user-1");

    // Filter by scope: paid_by_me
    const paidByMeBtn = screen.getByRole("button", { name: "splits.filters.scopePaidByMe" });
    await user.click(paidByMeBtn);

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(screen.getByText("Gelato in Florence")).toBeInTheDocument();
    expect(screen.queryByText("Taxi ride")).not.toBeInTheDocument();

    // Reopen and test scope: my_share
    await user.click(filterBtn);
    const myShareBtn = screen.getByRole("button", { name: "splits.filters.scopeMyShare" });
    await user.click(myShareBtn);
    const payerSelect2 = screen.getByLabelText("splits.filters.payer");
    const categorySelect2 = screen.getByLabelText("splits.filters.category");
    await user.selectOptions(payerSelect2, "user-2");
    await user.selectOptions(categorySelect2, "transport");
    const applyBtn2 = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn2);

    expect(screen.queryByText("Gelato in Florence")).not.toBeInTheDocument();
    expect(screen.getByText("Taxi ride")).toBeInTheDocument();
  });

  it("filters expenses by dateFrom and excludes non-matching dates", async () => {
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

    const filterBtn = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(filterBtn);

    const datePickers = screen.getAllByRole("button", { name: /datePicker\.selectDate/ });
    if (datePickers[0]) {
      await user.click(datePickers[0]);
      const dayButtons = screen.getAllByRole("button");
      const day28 = dayButtons.find((btn) => btn.textContent?.trim() === "28");
      if (day28) {
        await user.click(day28);
      }
    }

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(screen.getByText("splits.filters.noFilteredResults")).toBeInTheDocument();
  });

  it("filters expenses by dateTo and excludes non-matching dates", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[{ ...mockExpenses[0], date: "2099-01-01" }]}
        settlements={[]}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    const filterBtn = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(filterBtn);

    const datePickers = screen.getAllByRole("button", { name: /datePicker\.selectDate/ });
    if (datePickers[1]) {
      await user.click(datePickers[1]);
      const dayButtons = screen.getAllByRole("button");
      const day1 = dayButtons.find((btn) => btn.textContent?.trim() === "1");
      if (day1) {
        await user.click(day1);
      }
    }

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(screen.getByText("splits.filters.noFilteredResults")).toBeInTheDocument();
  });

  it("filters expenses by payer only and excludes other payers", async () => {
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

    const filterBtn = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(filterBtn);

    const payerSelect = screen.getByLabelText("splits.filters.payer");
    await user.selectOptions(payerSelect, "user-2");

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(screen.getByText("Taxi ride")).toBeInTheDocument();
    expect(screen.queryByText("Gelato in Florence")).not.toBeInTheDocument();
  });

  it("handles deleting a settlement via confirmation popup", async () => {
    const user = userEvent.setup();
    deleteSettlementMock.mockImplementationOnce(async (_params, options) => {
      options?.onSuccess?.();
      return undefined;
    });

    const userSettlements: Settlement[] = [
      {
        id: "stl-mine",
        groupId: "grp-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 250,
        currency: "EUR",
        note: "Settlement note",
        status: "confirmed",
        date: "2026-08-13",
        createdBy: "user-1", // created by user-1 so canDelete is true
        createdAt: 1700000000000,
      },
    ];

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={userSettlements}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    // Expand settlements accordion
    const settlementsAccordion = screen.getByRole("button", { name: /splits\.feed\.settlements/i });
    await user.click(settlementsAccordion);

    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);

    expect(screen.getByText("splits.feed.deleteSettlementTitle")).toBeInTheDocument();
    expect(screen.getByText("splits.feed.deleteSettlementDesc")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "splits.actions.delete" });
    fireEvent.click(confirmBtn);

    expect(deleteSettlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        settlementId: "stl-mine",
      }),
      expect.any(Object),
    );
  });

  it("handles confirming a pending settlement", async () => {
    const user = userEvent.setup();

    const pendingSettlement: Settlement[] = [
      {
        id: "stl-pending",
        groupId: "grp-1",
        payerId: "user-2",
        receiverId: "user-1", // receiver is user-1 so canConfirm is true
        amount: 500,
        currency: "EUR",
        note: "",
        status: "pending",
        date: "2026-08-14",
        createdBy: "user-2",
        createdAt: 1700000000000,
      },
    ];

    renderWithProviders(
      <ActivityFeed
        group={mockGroup}
        members={mockMembers}
        expenses={[]}
        settlements={pendingSettlement}
        isLoading={false}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onEditExpense={vi.fn()}
      />
    );

    // Expand settlements accordion
    const settlementsAccordion = screen.getByRole("button", { name: /splits\.feed\.settlements/i });
    await user.click(settlementsAccordion);

    const markAsPaidBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markAsPaidBtn);

    expect(confirmSettlementMock).toHaveBeenCalledWith({
      groupId: "grp-1",
      settlementId: "stl-pending",
      expectedVersion: mockGroup.version,
    });
  });
});
