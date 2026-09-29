import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { GroupsListView } from "./GroupsListView";
import * as hooks from "../../hooks";
import type { Group } from "../../api/groups";

vi.mock("@flaner/shared/hooks", () => ({
  useDebounce: (val: string) => val,
  useIsMobile: () => false,
}));

vi.mock("../../hooks", () => ({
  useGetUserGroupsQuery: vi.fn(),
  useSearchGlobalGroupsQuery: vi.fn(),
}));

vi.mock("../../components/CreateGroupModal", () => ({
  CreateGroupModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-group-modal">Create Modal Content</div> : null,
}));

vi.mock("../../components/groups/GroupInvitationsSheet", () => ({
  GroupInvitationsSheet: () => <div data-testid="group-invitations-sheet" />,
}));

vi.mock("../../components/groups/GroupCard", () => ({
  GroupCard: ({ group }: { group: { name: string } }) => (
    <div data-testid="group-card">{group.name}</div>
  ),
}));

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("GroupsListView page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useSearchGlobalGroupsQuery).mockReturnValue({
      data: { pages: [{ groups: [] }] },
      isFetching: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof hooks.useSearchGlobalGroupsQuery>);
  });

  it("renders empty state when user has no groups and opens create modal", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    renderWithProviders(<GroupsListView />);

    expect(screen.getByText("groupsView.title")).toBeInTheDocument();
    expect(screen.getByText("groupsView.emptyState.title")).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: "groupsView.emptyState.actionBtn" });
    await user.click(createBtn);

    expect(screen.getByTestId("create-group-modal")).toBeInTheDocument();
  });

  it("renders list of user groups and filters by local search query", async () => {
    const mockGroups = [
      createMockGroup({ id: "g-1", name: "Biking Crew" }),
      createMockGroup({ id: "g-2", name: "Hiking Team" }),
    ] as unknown as Group[];

    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: mockGroups,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    renderWithProviders(<GroupsListView />);

    expect(screen.getByText("Biking Crew")).toBeInTheDocument();
    expect(screen.getByText("Hiking Team")).toBeInTheDocument();

    // Filter input
    const filterInput = screen.getByPlaceholderText("groupsView.filterPlaceholder");
    fireEvent.change(filterInput, { target: { value: "Biking" } });

    expect(screen.getByText("Biking Crew")).toBeInTheDocument();
    expect(screen.queryByText("Hiking Team")).not.toBeInTheDocument();
  });
});
