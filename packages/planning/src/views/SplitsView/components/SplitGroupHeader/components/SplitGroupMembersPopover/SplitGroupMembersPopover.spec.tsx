import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../../../api/splits";
import type { SplitGroupMember } from "../../../../../../hooks/useSplitGroupMembers";
import { SplitGroupMembersPopover } from "./SplitGroupMembersPopover";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
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

const removeParticipantMock = vi.fn().mockImplementation(async (_params, options) => {
  options?.onSuccess?.();
  return undefined;
});

vi.mock("../../../../../../hooks/api/mutation", () => ({
  useRemoveParticipantFromGroupMutation: () => ({
    mutateAsync: removeParticipantMock,
    isPending: false,
  }),
}));

describe("SplitGroupMembersPopover", () => {
  it("renders member names, creator badge and (you) badge when open", () => {
    renderWithProviders(
      <SplitGroupMembersPopover
        group={mockGroup}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      >
        <button type="button">Trigger</button>
      </SplitGroupMembersPopover>
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("(splits.you)")).toBeInTheDocument();
    expect(screen.getByText("splits.members.creatorBadge")).toBeInTheDocument();
  });

  it("allows group owner to remove another participant with confirmation", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SplitGroupMembersPopover
        group={mockGroup}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      >
        <button type="button">Trigger</button>
      </SplitGroupMembersPopover>
    );

    const removeBtn = screen.getByRole("button", { name: "splits.members.remove" });
    await user.click(removeBtn);

    expect(screen.getByText("splits.members.removeTitle")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "splits.members.remove" });
    fireEvent.click(confirmBtn);

    expect(removeParticipantMock).toHaveBeenCalledWith(
      { groupId: "grp-1", participantId: "user-2" },
      expect.any(Object),
    );
  });

  it("allows non-owner to leave group and resets hash navigation", async () => {
    const user = userEvent.setup();
    const nonOwnerGroup: SplitGroup = {
      ...mockGroup,
      createdBy: "user-2",
    };

    renderWithProviders(
      <SplitGroupMembersPopover
        group={nonOwnerGroup}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      >
        <button type="button">Trigger</button>
      </SplitGroupMembersPopover>
    );

    const leaveBtn = screen.getByRole("button", { name: "splits.members.leave" });
    await user.click(leaveBtn);

    expect(screen.getByText("splits.members.leaveTitle")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "splits.members.leave" });
    fireEvent.click(confirmBtn);

    expect(removeParticipantMock).toHaveBeenCalledWith(
      { groupId: "grp-1", participantId: "user-1" },
      expect.any(Object),
    );
  });

  it("handles cancel button in confirmation popup and error rejection", async () => {
    const user = userEvent.setup();
    removeParticipantMock.mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(
      <SplitGroupMembersPopover
        group={mockGroup}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      >
        <button type="button">Trigger</button>
      </SplitGroupMembersPopover>
    );

    const removeBtn = screen.getByRole("button", { name: "splits.members.remove" });
    await user.click(removeBtn);

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);

    expect(screen.queryByText("splits.members.removeTitle")).not.toBeInTheDocument();

    // Reopen and test rejection catch block
    await user.click(removeBtn);
    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "splits.members.remove" });
    fireEvent.click(confirmBtn);

    expect(removeParticipantMock).toHaveBeenCalled();
  });

  it("disables remove/leave button when member has outstanding balance", () => {
    const groupWithBalance: SplitGroup = {
      ...mockGroup,
      balances: { EUR: { "user-2": 500, "user-1": -500 } },
      pairBalances: { EUR: { "user-1__user-2": -500 } },
    };

    renderWithProviders(
      <SplitGroupMembersPopover
        group={groupWithBalance}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      >
        <button type="button">Trigger</button>
      </SplitGroupMembersPopover>
    );

    const removeBtn = screen.getByRole("button", { name: "splits.members.remove" });
    expect(removeBtn).toBeDisabled();
    expect(screen.getByTitle("splits.members.blockedBalance")).toBeInTheDocument();
  });

  it("disables leave button for non-owner when user has balance", () => {
    const groupWithBalance: SplitGroup = {
      ...mockGroup,
      createdBy: "user-2",
      balances: { EUR: { "user-1": -500 } },
      pairBalances: { EUR: { "user-1__user-2": -500 } },
    };

    renderWithProviders(
      <SplitGroupMembersPopover
        group={groupWithBalance}
        members={mockMembers}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const leaveBtn = screen.getByRole("button", { name: "splits.members.leave" });
    expect(leaveBtn).toBeDisabled();
  });

  it("handles uncontrolled mode and unauthenticated user", () => {
    renderWithProviders(<SplitGroupMembersPopover group={mockGroup} members={mockMembers} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});
