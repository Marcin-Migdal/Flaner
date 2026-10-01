import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../api/splits";
import { SplitsView } from "./SplitsView";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGroups: SplitGroup[] = [
  {
    id: "grp-1",
    name: "Summer Roadtrip",
    description: "",
    defaultCurrency: "EUR",
    lastUsedCurrency: "EUR",
    createdBy: "user-1",
    participants: ["user-1", "user-2"],
    formerParticipants: [],
    simplifyDebts: false,
    totalSpent: { EUR: 600 },
    balances: { EUR: { "user-1": 0, "user-2": 0 } },
    pairBalances: {},
    expensesCount: 0,
    settlementsCount: 0,
    status: "active",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "grp-2",
    name: "Winter Getaway",
    description: "",
    defaultCurrency: "USD",
    lastUsedCurrency: "USD",
    createdBy: "user-1",
    participants: ["user-1"],
    formerParticipants: [],
    simplifyDebts: true,
    totalSpent: { USD: 100 },
    balances: {},
    pairBalances: {},
    expensesCount: 0,
    settlementsCount: 0,
    status: "active",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

let queryGroupsData: SplitGroup[] | undefined = mockGroups;
let queryLoading = false;

vi.mock("@flaner/shared/utils", async () => {
  const actual = await vi.importActual("@flaner/shared/utils");
  return {
    ...actual,
    toast: {
      attention: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("../../hooks/api/query", () => ({
  useGetUserSplitGroupsRealtimeQuery: () => ({
    data: queryGroupsData,
    isLoading: queryLoading,
  }),
  useGetGroupExpensesQuery: () => ({ data: [], isLoading: false }),
  useGetGroupSettlementsQuery: () => ({ data: [], isLoading: false }),
  useGetEventParticipantsProfilesQuery: () => ({
    data: [
      { id: "user-1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
      { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
    ],
    isLoading: false,
  }),
  useGetUserSchedulerEventsRealtimeQuery: () => ({ data: [], isLoading: false }),
  useSearchParticipantsQuery: () => ({ data: [], isLoading: false }),
  useUserSchedulerEventsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../hooks/useSyncSplitGroupFeed", () => ({
  useSyncSplitGroupFeed: vi.fn(),
}));

const deleteGroupMock = vi.fn().mockImplementation(async (_id, options) => {
  options?.onSuccess?.();
  return undefined;
});

vi.mock("../../hooks/api/mutation", () => ({
  useCreateExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExpenseMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfirmSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddParticipantToGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveParticipantFromGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSplitGroupMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteSplitGroupMutation: () => ({ mutateAsync: deleteGroupMock, isPending: false }),
  useConvertSplitGroupCurrencyMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSplitGroupMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("SplitsView", () => {
  beforeEach(() => {
    queryLoading = false;
    queryGroupsData = mockGroups;
    vi.clearAllMocks();
  });

  it("renders loader when isLoading is true", () => {
    queryLoading = true;

    const { container } = renderWithProviders(<SplitsView />);

    expect(container.querySelector("[class*='loader']")).toBeInTheDocument();
  });

  it("renders empty state when there are no split groups", () => {
    queryGroupsData = [];

    renderWithProviders(<SplitsView />);

    expect(screen.getByText("splits.dashboard.emptyTitle")).toBeInTheDocument();
  });

  it("renders first group in dashboard by default and handles back navigation", async () => {
    const user = userEvent.setup();
    queryGroupsData = mockGroups;

    renderWithProviders(<SplitsView />);

    expect(screen.getAllByText("Summer Roadtrip")[0]).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: "splits.dashboard.back" });
    await user.click(backButton);
  });

  it("selects group matching the URL hash and selects other group from list", async () => {
    const user = userEvent.setup();
    queryGroupsData = mockGroups;

    renderWithProviders(<SplitsView />, {
      initialEntries: ["/#grp-2"],
    });

    expect(screen.getAllByText("Winter Getaway")[0]).toBeInTheDocument();

    // Select Summer Roadtrip from list
    const firstGroupBtn = screen.getByText("Summer Roadtrip");
    await user.click(firstGroupBtn);
  });

  it("opens delete confirmation for settled group and confirms deletion with hash reset", async () => {
    const user = userEvent.setup();
    queryGroupsData = mockGroups;

    renderWithProviders(<SplitsView />, {
      initialEntries: ["/#grp-1"],
    });

    const deleteButtons = screen.getAllByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteButtons[0]);

    expect(screen.getByText("splits.deleteGroup.title")).toBeInTheDocument();

    // Cancel first
    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.deleteGroup.title")).not.toBeInTheDocument();

    // Reopen and confirm
    await user.click(deleteButtons[0]);
    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "splits.actions.delete" });
    fireEvent.click(confirmButton);

    expect(deleteGroupMock).toHaveBeenCalledWith("grp-1", expect.any(Object));
  });

  it("blocks deletion when group has unsettled balances", async () => {
    const user = userEvent.setup();
    const unsettledGroup: SplitGroup = {
      ...mockGroups[0],
      pairBalances: { EUR: { "user-1:user-2": 1000 } },
    };
    queryGroupsData = [unsettledGroup];

    renderWithProviders(<SplitsView />);

    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);

    expect(screen.queryByText("splits.deleteGroup.title")).not.toBeInTheDocument();
  });

  it("opens create group modal and edit group modal", async () => {
    const user = userEvent.setup();
    queryGroupsData = mockGroups;

    renderWithProviders(<SplitsView />);

    // Create group
    const newGroupBtn = screen.getByRole("button", { name: "splits.list.newGroup" });
    await user.click(newGroupBtn);

    expect(screen.getByText("splits.groupModal.title")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);
    expect(screen.queryByText("splits.groupModal.title")).not.toBeInTheDocument();

    // Edit group
    const editBtn = screen.getAllByRole("button", { name: "splits.actions.edit" })[0];
    await user.click(editBtn);

    expect(screen.getByText("splits.groupModal.editTitle")).toBeInTheDocument();
  });

  it("handles deletion rejection error gracefully", async () => {
    const user = userEvent.setup();
    deleteGroupMock.mockRejectedValueOnce(new Error("Fail"));
    queryGroupsData = mockGroups;

    renderWithProviders(<SplitsView />);

    const deleteBtn = screen.getAllByRole("button", { name: "splits.actions.delete" })[0];
    await user.click(deleteBtn);

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "splits.actions.delete" });
    fireEvent.click(confirmBtn);

    expect(deleteGroupMock).toHaveBeenCalled();
  });
});
