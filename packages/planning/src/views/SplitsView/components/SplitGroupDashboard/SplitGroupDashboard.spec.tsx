import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits";
import { SplitGroupDashboard } from "./SplitGroupDashboard";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../hooks/useSyncSplitGroupFeed", () => ({
  useSyncSplitGroupFeed: vi.fn(),
}));

const mockExpense = {
  id: "exp-1",
  groupId: "grp-1",
  title: "Groceries",
  amount: 5000,
  currency: "EUR",
  category: "food" as const,
  paidBy: "user-1",
  splitType: "equally" as const,
  splits: [
    { userId: "user-1", amount: 2500 },
    { userId: "user-2", amount: 2500 },
  ],
  date: "2026-10-01",
  createdAt: 1700000000000,
  createdBy: "user-1",
  version: 1,
};

vi.mock("../../../../hooks/api/query", () => ({
  useGetGroupExpensesQuery: () => ({ data: [mockExpense], isLoading: false }),
  useGetGroupSettlementsQuery: () => ({ data: [], isLoading: false }),
  useGetEventParticipantsProfilesQuery: () => ({
    data: [
      { id: "user-1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
      { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
    ],
    isLoading: false,
  }),
  useGetUserSplitGroupsRealtimeQuery: () => ({ data: [], isLoading: false }),
  useGetUserSchedulerEventsRealtimeQuery: () => ({ data: [], isLoading: false }),
  useSearchParticipantsQuery: () => ({ data: [], isLoading: false }),
  useUserSchedulerEventsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../../../hooks/api/mutation", () => ({
  useCreateExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfirmSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddParticipantToGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveParticipantFromGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSplitGroupMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteSplitGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConvertSplitGroupCurrencyMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Hiking Trip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: { EUR: 350 },
  balances: { EUR: { "user-1": -100, "user-2": 100 } },
  pairBalances: { EUR: { "user-1__user-2": -100 } },
  expensesCount: 1,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SplitGroupDashboard", () => {
  it("renders group header, metrics, and default activity tab", () => {
    renderWithProviders(<SplitGroupDashboard group={mockGroup} onBack={vi.fn()} />);

    expect(screen.getByText("Hiking Trip")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "splits.tabs.activity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "splits.tabs.balances" })).toBeInTheDocument();
  });

  it("switches to balances tab when clicked and handles settle debt", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SplitGroupDashboard group={mockGroup} onBack={vi.fn()} />);

    const balancesTab = screen.getByRole("tab", { name: "splits.tabs.balances" });
    await user.click(balancesTab);

    expect(balancesTab).toHaveAttribute("data-state", "active");

    // Settle button in debt card opens SettleUpModal with debt draft
    const settleDebtBtn = screen.getByRole("button", { name: "splits.actions.pay" });
    await user.click(settleDebtBtn);
    expect(screen.getByText("splits.settleModal.title")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.settleModal.title")).not.toBeInTheDocument();
  });

  it("opens ExpenseModal on Add Expense click and closes it", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SplitGroupDashboard group={mockGroup} onBack={vi.fn()} />);

    const addExpenseBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(addExpenseBtn);

    expect(screen.getByText("splits.expenseModal.title")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.expenseModal.title")).not.toBeInTheDocument();
  });

  it("opens ExpenseModal in edit mode from activity feed", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SplitGroupDashboard group={mockGroup} onBack={vi.fn()} />);

    const editBtn = screen.getByRole("button", { name: "splits.actions.edit" });
    await user.click(editBtn);

    expect(screen.getByText("splits.expenseModal.editTitle")).toBeInTheDocument();
  });

  it("triggers onBack when back button in header is clicked", async () => {
    const user = userEvent.setup();
    const onBackMock = vi.fn();

    renderWithProviders(<SplitGroupDashboard group={mockGroup} onBack={onBackMock} />);

    const backButton = screen.getByRole("button", { name: "splits.dashboard.back" });
    await user.click(backButton);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("opens SettleUpModal with fallback to defaultCurrency when lastUsedCurrency is empty and group has simplifiedDebts", async () => {
    const user = userEvent.setup();
    const groupWithDefaults: SplitGroup = {
      ...mockGroup,
      simplifyDebts: true,
      lastUsedCurrency: "",
    };

    renderWithProviders(<SplitGroupDashboard group={groupWithDefaults} onBack={vi.fn()} />);

    const settleUpBtn = screen.getByRole("button", { name: "splits.actions.settleUp" });
    await user.click(settleUpBtn);

    expect(screen.getByText("splits.settleModal.title")).toBeInTheDocument();
  });

  it("handles unauthenticated user and undefined simplifyDebts gracefully", () => {
    mockUser = null;
    const groupWithoutSimplify: SplitGroup = {
      ...mockGroup,
      simplifyDebts: undefined as unknown as boolean,
    };
    renderWithProviders(<SplitGroupDashboard group={groupWithoutSimplify} onBack={vi.fn()} />);
    expect(screen.getByText("Hiking Trip")).toBeInTheDocument();
    mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };
  });
});
