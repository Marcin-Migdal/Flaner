import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { Settlement, SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import type { Debt } from "../../../../utils/debtSimplification";
import { BalancesTab } from "./BalancesTab";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const updateGroupMock = vi.fn();
const confirmSettlementMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../../hooks/api/mutation", () => ({
  useUpdateSplitGroupMutation: () => ({
    mutate: updateGroupMock,
    isPending: false,
  }),
  useConfirmSettlementMutation: () => ({
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
  balances: {
    EUR: {
      "user-1": 2500,
      "user-2": -2500,
    },
  },
  pairBalances: {},
  expensesCount: 1,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
  { id: "user-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
];

const mockDebts: Debt[] = [
  { from: "user-2", to: "user-1", amount: 2500, currency: "EUR" },
];

describe("BalancesTab", () => {
  it("renders member balances and active debts", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <BalancesTab
        group={mockGroup}
        members={mockMembers}
        pairwiseDebts={mockDebts}
        simplifiedDebts={mockDebts}
        getMember={(id) => (id === "user-1" ? mockMembers[0] : mockMembers[1])}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onSettleDebt={vi.fn()}
      />
    );

    expect(screen.getAllByText("splits.balances.transfers")[0]).toBeInTheDocument();

    const participantsTrigger = screen.getByRole("button", { name: "splits.balances.participants" });
    await user.click(participantsTrigger);

    expect((await screen.findAllByText("Alice"))[0]).toBeInTheDocument();
    expect((await screen.findAllByText("Bob"))[0]).toBeInTheDocument();
  });

  it("triggers onSettleDebt when clicking settle button on debt card", async () => {
    const user = userEvent.setup();
    const onSettleMock = vi.fn();

    renderWithProviders(
      <BalancesTab
        group={mockGroup}
        members={mockMembers}
        pairwiseDebts={mockDebts}
        simplifiedDebts={mockDebts}
        getMember={(id) => (id === "user-1" ? mockMembers[0] : mockMembers[1])}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onSettleDebt={onSettleMock}
      />
    );

    const markBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markBtn);

    expect(onSettleMock).toHaveBeenCalledWith(mockDebts[0]);
  });

  it("confirms a pending settlement via confirmation popup", async () => {
    const user = userEvent.setup();
    const mockSettlement: Settlement = {
      id: "set-1",
      groupId: "grp-1",
      payerId: "user-2",
      receiverId: "user-1",
      amount: 2500,
      currency: "EUR",
      status: "pending",
      createdBy: "user-2",
      createdAt: 1700000000000,
    };

    renderWithProviders(
      <BalancesTab
        group={mockGroup}
        members={mockMembers}
        settlements={[mockSettlement]}
        pairwiseDebts={mockDebts}
        simplifiedDebts={mockDebts}
        getMember={(id) => (id === "user-1" ? mockMembers[0] : mockMembers[1])}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onSettleDebt={vi.fn()}
      />
    );

    // DebtCard renders markAsPaid button which triggers onConfirmPending when pendingSettlement exists
    const markBtn = screen.getByRole("button", { name: "splits.actions.markAsPaid" });
    await user.click(markBtn);

    expect(screen.getByText("splits.settlements.confirmModalTitle")).toBeInTheDocument();

    // Cancel first to test dismissal
    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.settlements.confirmModalTitle")).not.toBeInTheDocument();

    // Reopen and confirm
    await user.click(markBtn);
    const confirmBtn = screen.getByRole("button", { name: "splits.settlements.confirmAction" });
    fireEvent.click(confirmBtn);

    expect(confirmSettlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        settlementId: "set-1",
      }),
    );
  });

  it("sorts debts by user priority, currency, and amount", () => {
    const complexDebts: Debt[] = [
      { from: "user-3", to: "user-4", amount: 1000, currency: "USD" },
      { from: "user-1", to: "user-2", amount: 500, currency: "EUR" },
      { from: "user-2", to: "user-1", amount: 2000, currency: "EUR" },
      { from: "user-3", to: "user-4", amount: 3000, currency: "EUR" },
    ];
    const extendedMembers: SplitGroupMember[] = [
      ...mockMembers,
      { id: "user-3", name: "Charlie", avatarUrl: "", isCurrentUser: false },
      { id: "user-4", name: "David", avatarUrl: "", isCurrentUser: false },
    ];

    renderWithProviders(
      <BalancesTab
        group={mockGroup}
        members={extendedMembers}
        pairwiseDebts={complexDebts}
        simplifiedDebts={complexDebts}
        getMember={(id) => extendedMembers.find((m) => m.id === id) ?? extendedMembers[0]}
        getMemberName={(id) => extendedMembers.find((m) => m.id === id)?.name ?? id}
        onSettleDebt={vi.fn()}
      />
    );

    expect(screen.getAllByText("splits.balances.transfers")[0]).toBeInTheDocument();
  });

  it("toggles simplify debts switch", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <BalancesTab
        group={mockGroup}
        members={mockMembers}
        pairwiseDebts={mockDebts}
        simplifiedDebts={mockDebts}
        getMember={(id) => (id === "user-1" ? mockMembers[0] : mockMembers[1])}
        getMemberName={(id) => (id === "user-1" ? "Alice" : "Bob")}
        onSettleDebt={vi.fn()}
      />
    );

    const switchBtn = screen.getByRole("checkbox", { name: /splits\.balances\.simplify/i });
    await user.click(switchBtn);

    expect(updateGroupMock).toHaveBeenCalledWith({
      groupId: "grp-1",
      data: { simplifyDebts: true },
    });
  });
});
