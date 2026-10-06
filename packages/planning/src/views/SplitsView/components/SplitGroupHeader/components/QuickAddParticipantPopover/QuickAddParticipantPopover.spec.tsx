import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../../../api/splits";
import type { UserParticipant } from "../../../../../../api/participants";
import { QuickAddParticipantPopover } from "./QuickAddParticipantPopover";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@flaner/shared/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/hooks")>();
  return {
    ...actual,
    useDebounce: <T,>(value: T): T => value,
  };
});

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1"],
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

const mockSearchResults: UserParticipant[] = [
  { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
];

vi.mock("../../../../../../hooks/api/query", () => ({
  useSearchParticipantsQuery: () => ({
    data: mockSearchResults,
    isLoading: false,
  }),
}));

const addParticipantMock = vi.fn().mockImplementation((_params, options?: { onSuccess?: () => void }) => {
  options?.onSuccess?.();
});

vi.mock("../../../../../../hooks/api/mutation", () => ({
  useAddParticipantToGroupMutation: () => ({
    mutate: addParticipantMock,
    isPending: false,
  }),
}));

describe("QuickAddParticipantPopover", () => {
  it("renders trigger button and opens popover on click", async () => {
    const user = userEvent.setup();

    renderWithProviders(<QuickAddParticipantPopover group={mockGroup} />);

    const trigger = screen.getByRole("button", { name: "splits.dashboard.addParticipant" });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByPlaceholderText("splits.dashboard.searchUsers")).toBeInTheDocument();
  });

  it("adds participant on selecting a search result", async () => {
    const user = userEvent.setup();

    renderWithProviders(<QuickAddParticipantPopover group={mockGroup} />);

    const trigger = screen.getByRole("button", { name: "splits.dashboard.addParticipant" });
    await user.click(trigger);

    const input = screen.getByPlaceholderText("splits.dashboard.searchUsers");
    await user.type(input, "Bob");

    const bobOption = await screen.findByText("Bob");
    await user.click(bobOption);

    expect(addParticipantMock).toHaveBeenCalledWith(
      { groupId: "grp-1", participantId: "user-2" },
      expect.any(Object),
    );
  });
});
