import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { GroupDetailsView } from "./GroupDetailsView";
import * as hooks from "../../hooks";
import type { Group } from "../../api/groups";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ groupId: "grp-1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123", username: "currentuser" } })),
}));

vi.mock("../../components/groups/InviteToGroupModal", () => ({
  InviteToGroupModal: () => <div data-testid="invite-modal" />,
}));

vi.mock("../../components/groups/ManageGroupSheet", () => ({
  ManageGroupSheet: () => <div data-testid="manage-group-sheet" />,
}));

vi.mock("../../components/groups/RequestsSheet", () => ({
  RequestsSheet: () => <div data-testid="requests-sheet" />,
}));

vi.mock("../../hooks", () => ({
  useGetUserGroupsQuery: vi.fn(),
  useGetGroupQuery: vi.fn(),
  useGetGroupMembersQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useGetUserGroupRequestQuery: vi.fn(),
  useGetFriendsListRealtimeQuery: vi.fn(),
  useGetSentFriendRequestRealtimeQuery: vi.fn(),
  useGetReceivedFriendRequestRealtimeQuery: vi.fn(),
  useAddGroupMemberMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRequestJoinGroupMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveGroupMemberMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSendFriendRequestMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelFriendRequestMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAcceptFriendRequestMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.count) return `${key}:${params.count}`;
      return key;
    },
    i18n: { language: "en" },
  }),
}));

describe("GroupDetailsView page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useGetUserGroupRequestQuery).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof hooks.useGetUserGroupRequestQuery>);

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    vi.mocked(hooks.useGetSentFriendRequestRealtimeQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof hooks.useGetSentFriendRequestRealtimeQuery>);

    vi.mocked(hooks.useGetReceivedFriendRequestRealtimeQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof hooks.useGetReceivedFriendRequestRealtimeQuery>);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);
  });

  it("renders loading state when group data is loading", () => {
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetGroupQuery>);

    renderWithProviders(<GroupDetailsView />);

    expect(screen.getByText("groupDetails.loading")).toBeInTheDocument();
  });

  it("renders not found state when group does not exist", () => {
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupQuery>);

    renderWithProviders(<GroupDetailsView />);

    expect(screen.getByText("groupDetails.notFound")).toBeInTheDocument();
  });

  it("renders group details and members for an active member", () => {
    const mockGroup = createMockGroup({
      id: "grp-1",
      name: "Mountain Hikers",
      type: "public",
      description: "Hikes and trails",
    }) as unknown as Group;

    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({
      data: [mockGroup],
    } as unknown as ReturnType<typeof hooks.useGetUserGroupsQuery>);

    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({
      data: mockGroup,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupQuery>);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [{ userId: "user-123", role: "owner", joinedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [{ uid: "user-123", username: "ClimberOwner" } as never],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderWithProviders(<GroupDetailsView />);

    expect(screen.getByText("Mountain Hikers")).toBeInTheDocument();
    expect(screen.getByText("Hikes and trails")).toBeInTheDocument();
    expect(screen.getByText("ClimberOwner")).toBeInTheDocument();
    expect(screen.getByTestId("manage-group-sheet")).toBeInTheDocument();
  });
});
