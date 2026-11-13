import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import type { Settlement, SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { SettleUpModal, type SettleUpDraft } from "./SettleUpModal";
import { toast } from "@flaner/shared/utils";

const mockUser = createMockUser({ uid: "user-1", username: "Alice", email: "alice@flaner.app" });

vi.mock("@flaner/shared/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/utils")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      attention: vi.fn(),
      failure: vi.fn(),
      success: vi.fn(),
    },
  };
});

const createSettlementMock = vi.fn().mockImplementation((_args, options) => {
  options?.onSuccess?.();
  return Promise.resolve("settle-id");
});

vi.mock("../../../../hooks/api/mutation", () => ({
  useCreateSettlementMutation: () => ({
    mutateAsync: createSettlementMock,
    isPending: false,
  }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip 2026",
  description: "Epic roadtrip across Europe",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: true,
  totalSpent: { EUR: 0 },
  balances: {
    EUR: {
      "user-1": -2000,
      "user-2": 2000,
    },
  },
  pairBalances: {},
  expensesCount: 0,
  settlementsCount: 0,
  status: "active",
  version: 1,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", isCurrentUser: true },
  { id: "user-2", name: "Bob", isCurrentUser: false },
];

const mockDraft: SettleUpDraft = {
  payerId: "user-1",
  receiverId: "user-2",
  amount: 2000,
  currency: "EUR",
};

describe("SettleUpModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render dialog content when draft is null", () => {
    renderWithProviders(
      <SettleUpModal draft={null} onClose={vi.fn()} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    expect(screen.queryByText("splits.settleModal.title")).not.toBeInTheDocument();
  });

  it("renders modal with draft values and submits settlement successfully", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    expect(screen.getByText("splits.settleModal.title")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(saveBtn);

    expect(createSettlementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        data: expect.objectContaining({
          payerId: "user-1",
          receiverId: "user-2",
          amount: 2000,
          currency: "EUR",
        }),
      }),
      expect.anything(),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("shows validation error when settlement amount exceeds outstanding debt", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const overpayingDraft: SettleUpDraft = {
      ...mockDraft,
      amount: 5000, // 50.00 EUR > 20.00 EUR debt
    };

    renderWithProviders(
      <SettleUpModal draft={overpayingDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    const saveBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(saveBtn);

    expect(await screen.findByText("errors.settlementAmountExceedsDebt")).toBeInTheDocument();
    expect(createSettlementMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows attention toast when there is no outstanding debt to settle", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const noDebtGroup: SplitGroup = {
      ...mockGroup,
      balances: {},
    };

    renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={noDebtGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    const saveBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(saveBtn);

    expect(toast.attention).toHaveBeenCalledWith("errors.noOutstandingDebtToSettle");
    expect(createSettlementMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows attention toast when the whole debt is already waiting for confirmation", async () => {
    const user = userEvent.setup();
    const pending: Settlement = {
      id: "s1",
      groupId: "grp-1",
      payerId: "user-1",
      receiverId: "user-2",
      amount: 2000,
      currency: "EUR",
      date: "2026-06-01",
      note: "",
      status: "pending",
      createdBy: "user-1",
      createdAt: 1,
    };

    renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={vi.fn()} group={mockGroup} members={mockMembers} settlements={[pending]} />,
      { user: mockUser },
    );

    await user.click(screen.getByRole("button", { name: "splits.actions.save" }));

    expect(toast.attention).toHaveBeenCalledWith("errors.settlementAlreadyPending");
    expect(createSettlementMock).not.toHaveBeenCalled();
  });

  it("displays stale warning and refreshes amount when group version changes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    expect(screen.queryByText("splits.settleModal.staleWarning")).not.toBeInTheDocument();

    const updatedGroup: SplitGroup = {
      ...mockGroup,
      version: 2,
      balances: {
        EUR: {
          "user-1": -1000,
          "user-2": 1000,
        },
      },
    };

    rerender(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={updatedGroup} members={mockMembers} settlements={[]} />,
    );

    expect(screen.getByText("splits.settleModal.staleWarning")).toBeInTheDocument();

    const refreshBtn = screen.getByRole("button", { name: "splits.settleModal.refreshAmount" });
    await user.click(refreshBtn);

    expect(screen.queryByText("splits.settleModal.staleWarning")).not.toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("resets openedVersion when draft transitions to null and handles dialog dismissal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = renderWithProviders(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
      { user: mockUser },
    );

    rerender(
      <SettleUpModal draft={null} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
    );
    expect(screen.queryByText("splits.settleModal.title")).not.toBeInTheDocument();

    rerender(
      <SettleUpModal draft={mockDraft} onClose={onClose} group={mockGroup} members={mockMembers} settlements={[]} />,
    );
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
