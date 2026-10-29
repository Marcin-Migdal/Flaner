import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits";
import { SplitGroupsList } from "./SplitGroupsList";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGroups: SplitGroup[] = [
  {
    id: "grp-1",
    name: "Ski Trip Alps",
    description: "",
    defaultCurrency: "EUR",
    lastUsedCurrency: "EUR",
    createdBy: "user-1",
    participants: ["user-1", "user-2"],
    formerParticipants: [],
    simplifyDebts: false,
    totalSpent: { EUR: 500 },
    balances: {},
    pairBalances: {},
    expensesCount: 0,
    settlementsCount: 0,
    status: "active",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "grp-2",
    name: "Weekend Cabin",
    description: "",
    defaultCurrency: "PLN",
    lastUsedCurrency: "PLN",
    createdBy: "user-2",
    participants: ["user-1", "user-2"],
    formerParticipants: [],
    simplifyDebts: true,
    totalSpent: { PLN: 1200 },
    balances: {},
    pairBalances: {},
    expensesCount: 0,
    settlementsCount: 0,
    status: "active",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

describe("SplitGroupsList", () => {
  it("renders empty state when there are no groups", () => {
    renderWithProviders(
      <SplitGroupsList
        groups={[]}
        isLoading={false}
        onSelectGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onEditGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );

    expect(screen.getByText("splits.list.emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("splits.list.emptyDesc")).toBeInTheDocument();
  });

  it("renders list of groups and triggers create group action", async () => {
    const user = userEvent.setup();
    const onCreateGroupMock = vi.fn();

    renderWithProviders(
      <SplitGroupsList
        groups={mockGroups}
        isLoading={false}
        activeGroupId="grp-1"
        onSelectGroup={vi.fn()}
        onCreateGroup={onCreateGroupMock}
        onEditGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );

    expect(screen.getByText("Ski Trip Alps")).toBeInTheDocument();
    expect(screen.getByText("Weekend Cabin")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: "splits.list.newGroup" });
    await user.click(addBtn);
    expect(onCreateGroupMock).toHaveBeenCalledTimes(1);
  });

  it("filters groups based on search query and allows clearing search", async () => {
    const user = userEvent.setup();

    const { container } = renderWithProviders(
      <SplitGroupsList
        groups={mockGroups}
        isLoading={false}
        onSelectGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onEditGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("splits.list.searchPlaceholder");
    await user.type(searchInput, "Ski");

    expect(screen.getByText("Ski Trip Alps")).toBeInTheDocument();
    expect(screen.queryByText("Weekend Cabin")).not.toBeInTheDocument();

    // Clear search using the clear button in IconTextField
    const clearBtn = container.querySelector("button.rounded-full");
    if (clearBtn) {
      await user.click(clearBtn);
      expect(searchInput).toHaveValue("");
      expect(screen.getByText("Weekend Cabin")).toBeInTheDocument();
    }

    await user.clear(searchInput);
    await user.type(searchInput, "NonExistentGroup");

    expect(screen.getByText("splits.list.noResults")).toBeInTheDocument();
  });

  it("renders skeletons when isLoading is true", () => {
    const { container } = renderWithProviders(
      <SplitGroupsList
        groups={mockGroups}
        isLoading={true}
        onSelectGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onEditGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });

  it("triggers select, edit, and delete callbacks on group card actions", async () => {
    const user = userEvent.setup();
    const onSelectGroupMock = vi.fn();
    const onEditGroupMock = vi.fn();
    const onDeleteGroupMock = vi.fn();

    renderWithProviders(
      <SplitGroupsList
        groups={mockGroups}
        isLoading={false}
        activeGroupId="grp-1"
        onSelectGroup={onSelectGroupMock}
        onCreateGroup={vi.fn()}
        onEditGroup={onEditGroupMock}
        onDeleteGroup={onDeleteGroupMock}
      />
    );

    // Select group (click card name button)
    const selectBtn = screen.getByText("Ski Trip Alps");
    await user.click(selectBtn);
    expect(onSelectGroupMock).toHaveBeenCalledWith("grp-1");

    // Edit group (owner is user-1, grp-1 owner is user-1)
    const editBtn = screen.getByRole("button", { name: "splits.actions.edit" });
    await user.click(editBtn);
    expect(onEditGroupMock).toHaveBeenCalledWith(mockGroups[0]);

    // Delete group
    const deleteBtn = screen.getByRole("button", { name: "splits.actions.delete" });
    await user.click(deleteBtn);
    expect(onDeleteGroupMock).toHaveBeenCalledWith(mockGroups[0]);
  });
});
