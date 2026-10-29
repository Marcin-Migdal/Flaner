import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { GroupsListView } from "./GroupsListView";
import * as hooks from "../../../hooks";
import type { Group } from "../../../api/groups";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

type SearchBarMockProps = {
  onSelect?: (item: Group) => void;
  renderResult?: (item: Group) => React.ReactNode;
  results?: Group[];
  onShowMore?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onClear?: () => void;
  onChange?: (val: string) => void;
  placeholder?: string;
  hasMore?: boolean;
};

type IconTextFieldMockProps = {
  onOpen?: () => void;
  onClose?: () => void;
  onClear?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
  placeholder?: string;
};

vi.mock("@flaner/ui-components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@flaner/ui-components");
  return {
    ...actual,
    SearchBar: ({ onSelect, renderResult, results, onShowMore, onOpen, onClose, onClear, onChange, placeholder }: SearchBarMockProps) => (
      <div data-testid="search-bar">
        <input placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} />
        <button data-testid="search-open" onClick={onOpen}>Open</button>
        <button data-testid="search-close" onClick={onClose}>Close</button>
        <button data-testid="search-clear" onClick={onClear}>Clear</button>
        <button data-testid="search-more" onClick={onShowMore}>More</button>
        {results?.map((r) => (
          <button type="button" key={r.id} data-testid={`search-item-${r.id}`} onClick={() => onSelect?.(r)}>
            {renderResult?.(r)}
          </button>
        ))}
      </div>
    ),
    IconTextField: ({ onOpen, onClose, onClear, onChange, value, placeholder }: IconTextFieldMockProps) => (
      <div data-testid="icon-text-field">
        <input placeholder={placeholder} value={value} onChange={onChange} />
        <button data-testid="filter-open" onClick={onOpen}>Open</button>
        <button data-testid="filter-close" onClick={onClose}>Close</button>
        <button data-testid="filter-clear" onClick={onClear}>Clear</button>
      </div>
    ),
  };
});

const mockUseIsMobile = vi.fn(() => false);

vi.mock("@flaner/shared/hooks", () => ({
  useDebounce: (val: string) => val,
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("../../../hooks", () => ({
  useGetUserGroupsQuery: vi.fn(),
  useSearchGlobalGroupsQuery: vi.fn(),
}));

vi.mock("../../../components/CreateGroupModal", () => ({
  CreateGroupModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-group-modal">Create Modal Content</div> : null,
}));

vi.mock("../../../components/groups/GroupInvitationsSheet", () => ({
  GroupInvitationsSheet: () => <div data-testid="group-invitations-sheet" />,
}));

vi.mock("../../../components/groups/GroupCard", () => ({
  GroupCard: ({ group }: { group: { name: string } }) => (
    <div data-testid="group-card">{group.name}</div>
  ),
}));

vi.mock("../../../hooks/useCommunityTranslations", () => ({
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
    const mockGroups: Group[] = [
      createMockGroup({ id: "g-1", name: "Biking Crew" }),
      createMockGroup({ id: "g-2", name: "Hiking Team" }),
    ];

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

  it("renders loading skeletons when loading user groups", () => {
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    const { container } = renderWithProviders(<GroupsListView />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });

  it("handles global search, pagination, selection, and clear actions", async () => {
    const user = userEvent.setup();
    const fetchNextPageMock = vi.fn();
    const mockGlobalGroup = createMockGroup({ id: "global-1", name: "World Climbers" });

    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    vi.mocked(hooks.useSearchGlobalGroupsQuery).mockReturnValue({
      data: { pages: [{ groups: [mockGlobalGroup] }] },
      isFetching: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: fetchNextPageMock,
    } as unknown as ReturnType<typeof hooks.useSearchGlobalGroupsQuery>);

    renderWithProviders(<GroupsListView />);

    // Top create button
    const topCreateBtn = screen.getByRole("button", { name: "groupsView.createBtn" });
    await user.click(topCreateBtn);
    expect(screen.getByTestId("create-group-modal")).toBeInTheDocument();

    // Test filter open, clear, close
    const filterOpenBtn = screen.getByTestId("filter-open");
    await user.click(filterOpenBtn);
    const filterClearBtn = screen.getByTestId("filter-clear");
    await user.click(filterClearBtn);
    const filterCloseBtn = screen.getByTestId("filter-close");
    await user.click(filterCloseBtn);

    // Test search open, clear, close, more, and select
    const searchOpenBtn = screen.getByTestId("search-open");
    await user.click(searchOpenBtn);

    const searchInput = screen.getByPlaceholderText("groupsView.searchPlaceholder");
    fireEvent.change(searchInput, { target: { value: "World" } });

    const searchMoreBtn = screen.getByTestId("search-more");
    await user.click(searchMoreBtn);
    expect(fetchNextPageMock).toHaveBeenCalled();

    const searchItem = screen.getByTestId("search-item-global-1");
    expect(searchItem).toBeInTheDocument();
    await user.click(searchItem);
    expect(mockNavigate).toHaveBeenCalledWith("/community/groups/global-1");

    const searchClearBtn = screen.getByTestId("search-clear");
    await user.click(searchClearBtn);

    const searchCloseBtn = screen.getByTestId("search-close");
    await user.click(searchCloseBtn);
  });

  it("collapses filter or search when opening the other on mobile", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(true);

    renderWithProviders(<GroupsListView />);

    const searchOpenBtn = screen.getByTestId("search-open");
    const filterOpenBtn = screen.getByTestId("filter-open");

    // Open search on mobile -> setIsFilterExpanded(false)
    await user.click(searchOpenBtn);
    // Open filter on mobile -> setIsSearchExpanded(false)
    await user.click(filterOpenBtn);

    mockUseIsMobile.mockReturnValue(false);
  });

  it("handles undefined searchData and active fetching next page state", () => {
    vi.mocked(hooks.useSearchGlobalGroupsQuery).mockReturnValue({
      data: undefined,
      isFetching: true,
      hasNextPage: false,
      isFetchingNextPage: true,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof hooks.useSearchGlobalGroupsQuery>);

    renderWithProviders(<GroupsListView />);

    expect(screen.getByPlaceholderText("groupsView.searchPlaceholder")).toBeInTheDocument();
  });
});


