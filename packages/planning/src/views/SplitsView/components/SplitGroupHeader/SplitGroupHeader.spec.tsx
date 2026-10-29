import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { SplitGroupHeader } from "./SplitGroupHeader";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../hooks/api/query", () => ({
  useSearchParticipantsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../../../hooks/api/mutation", () => ({
  useAddParticipantToGroupMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveParticipantFromGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Camping Trip",
  description: "Weekend in the woods",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: {},
  balances: {},
  pairBalances: {},
  expensesCount: 0,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
  { id: "user-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
];

describe("SplitGroupHeader", () => {
  it("renders group title and description", () => {
    renderWithProviders(
      <SplitGroupHeader
        group={mockGroup}
        members={mockMembers}
        isMembersLoading={false}
        onBack={vi.fn()}
        onAddExpense={vi.fn()}
        onSettleUp={vi.fn()}
      />
    );

    expect(screen.getByText("Camping Trip")).toBeInTheDocument();
    expect(screen.getByText("Weekend in the woods")).toBeInTheDocument();
  });

  it("triggers onAddExpense and onSettleUp callbacks", async () => {
    const user = userEvent.setup();
    const onAddExpenseMock = vi.fn();
    const onSettleUpMock = vi.fn();

    renderWithProviders(
      <SplitGroupHeader
        group={mockGroup}
        members={mockMembers}
        isMembersLoading={false}
        onBack={vi.fn()}
        onAddExpense={onAddExpenseMock}
        onSettleUp={onSettleUpMock}
      />
    );

    const addExpenseBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    const settleUpBtn = screen.getByRole("button", { name: "splits.actions.settleUp" });

    await user.click(addExpenseBtn);
    expect(onAddExpenseMock).toHaveBeenCalledTimes(1);

    await user.click(settleUpBtn);
    expect(onSettleUpMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBackMock = vi.fn();

    renderWithProviders(
      <SplitGroupHeader
        group={mockGroup}
        members={mockMembers}
        isMembersLoading={false}
        onBack={onBackMock}
        onAddExpense={vi.fn()}
        onSettleUp={vi.fn()}
      />
    );

    const backBtn = screen.getByRole("button", { name: "splits.dashboard.back" });
    await user.click(backBtn);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("renders skeletons when isMembersLoading is true", () => {
    const { container } = renderWithProviders(
      <SplitGroupHeader
        group={mockGroup}
        members={mockMembers}
        isMembersLoading={true}
        onBack={vi.fn()}
        onAddExpense={vi.fn()}
        onSettleUp={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("opens members popover when clicking avatar button", async () => {
    const user = userEvent.setup();
    const manyMembers: SplitGroupMember[] = [
      { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
      { id: "u-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
    ];

    renderWithProviders(
      <SplitGroupHeader
        group={mockGroup}
        members={manyMembers}
        isMembersLoading={false}
        onBack={vi.fn()}
        onAddExpense={vi.fn()}
        onSettleUp={vi.fn()}
      />,
    );

    const avatarButtons = screen.getAllByRole("button", { name: "splits.members.title" });
    await user.click(avatarButtons[0]);
    expect(await screen.findByText("splits.members.creatorBadge")).toBeInTheDocument();
  });

  it("opens members popover when clicking overflow badge", async () => {
    const user = userEvent.setup();
    const manyMembers: SplitGroupMember[] = [
      { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
      { id: "u-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
      { id: "u-3", name: "Charlie", avatarUrl: "", isCurrentUser: false },
      { id: "u-4", name: "David", avatarUrl: "", isCurrentUser: false },
      { id: "u-5", name: "Eve", avatarUrl: "", isCurrentUser: false },
      { id: "u-6", name: "Frank", avatarUrl: "", isCurrentUser: false },
      { id: "u-7", name: "Grace", avatarUrl: "", isCurrentUser: false },
      { id: "u-8", name: "Heidi", avatarUrl: "", isCurrentUser: false },
    ];
    const groupWithMany = {
      ...mockGroup,
      participants: manyMembers.map((m) => m.id),
    };

    renderWithProviders(
      <SplitGroupHeader
        group={groupWithMany}
        members={manyMembers}
        isMembersLoading={false}
        onBack={vi.fn()}
        onAddExpense={vi.fn()}
        onSettleUp={vi.fn()}
      />,
    );

    const overflowBtn = screen.getByText("+2");
    await user.click(overflowBtn);
    expect(await screen.findByText("splits.members.creatorBadge")).toBeInTheDocument();
  });
});
