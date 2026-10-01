import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockGroup } from "@flaner/test-utils";
import { GroupDetailsView } from "./GroupDetailsView";
import * as hooks from "../../../hooks";
import type { Group } from "../../../api/groups";
import { useAuth } from "@flaner/shared/context";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: () => ({ groupId: "grp-1" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123", username: "currentuser" } })),
}));

vi.mock("../../../components/groups/InviteToGroupModal", () => ({
  InviteToGroupModal: () => <div data-testid="invite-modal" />,
}));

vi.mock("../../../components/groups/ManageGroupSheet", () => ({
  ManageGroupSheet: () => <div data-testid="manage-group-sheet" />,
}));

vi.mock("../../../components/groups/RequestsSheet", () => ({
  RequestsSheet: () => <div data-testid="requests-sheet" />,
}));

vi.mock("../../../hooks", () => ({
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

vi.mock("../../../hooks/useCommunityTranslations", () => ({
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

  it("renders access denied for non-member in private group", async () => {
    const user = userEvent.setup();
    const mockGroup: Group = createMockGroup({ id: "grp-1", type: "private" });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);

    renderWithProviders(<GroupDetailsView />);
    expect(screen.getByText("groupDetails.accessDenied")).toBeInTheDocument();
    const backBtn = screen.getByRole("button");
    await user.click(backBtn);
  });

  it("allows non-member to join a public group without approval", async () => {
    const user = userEvent.setup();
    const joinGroupMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(hooks.useAddGroupMemberMutation).mockReturnValue({
      mutateAsync: joinGroupMock,
      isPending: false,
    } as never);

    const mockGroup: Group = createMockGroup({ id: "grp-1", type: "public", requiresApproval: false });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);

    renderWithProviders(<GroupDetailsView />);
    const joinBtn = screen.getByRole("button", { name: "groupDetails.joinGroup" });
    await user.click(joinBtn);
    expect(joinGroupMock).toHaveBeenCalledWith({ groupId: "grp-1", userId: "user-123" });
  });

  it("allows non-member to request joining a public group with approval", async () => {
    const user = userEvent.setup();
    const requestJoinMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(hooks.useRequestJoinGroupMutation).mockReturnValue({
      mutateAsync: requestJoinMock,
      isPending: false,
    } as never);

    const mockGroup: Group = createMockGroup({ id: "grp-1", type: "public", requiresApproval: true });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetUserGroupRequestQuery).mockReturnValue({ data: null } as never);

    renderWithProviders(<GroupDetailsView />);
    const reqBtn = screen.getByRole("button", { name: "groupDetails.requestToJoin" });
    await user.click(reqBtn);
    expect(requestJoinMock).toHaveBeenCalledWith("grp-1");
  });

  it("shows request pending when user has already requested to join", () => {
    const mockGroup: Group = createMockGroup({ id: "grp-1", type: "public", requiresApproval: true });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetUserGroupRequestQuery).mockReturnValue({
      data: { userId: "user-123", requestedAt: 100 },
    } as never);

    renderWithProviders(<GroupDetailsView />);
    expect(screen.getByText("groupDetails.requestPending")).toBeInTheDocument();
  });

  it("allows non-owner member to leave group", async () => {
    const user = userEvent.setup();
    const leaveGroupMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(hooks.useRemoveGroupMemberMutation).mockReturnValue({
      mutateAsync: leaveGroupMock,
      isPending: false,
    } as never);

    const mockGroup: Group = createMockGroup({ id: "grp-1", ownerId: "owner-999" });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [mockGroup] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [
        { userId: "owner-999", role: "owner", joinedAt: 100 },
        { userId: "user-123", role: "member", joinedAt: 200 },
      ],
      isLoading: false,
    } as never);

    renderWithProviders(<GroupDetailsView />);
    // Open more options dropdown
    const moreBtn = screen.getByRole("button", { name: "groupDetails.moreOptions" });
    await user.click(moreBtn);

    const leaveItem = screen.getByText("groupDetails.leaveGroup");
    await user.click(leaveItem);

    expect(screen.getByText("groupDetails.leaveConfirmTitle")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "groupDetails.confirmLeaveBtn" });
    await user.click(confirmBtn);

    expect(leaveGroupMock).toHaveBeenCalledWith({ groupId: "grp-1", userId: "user-123" });
  });

  it("copies link to clipboard when share button is clicked", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const mockGroup: Group = createMockGroup({ id: "grp-1" });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [mockGroup] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);

    renderWithProviders(<GroupDetailsView />);
    const copyBtn = screen.getByRole("button", { name: "groupDetails.copyLinkBtn" });
    await user.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalled();
  });

  it("renders friend request actions on other member cards", async () => {
    const user = userEvent.setup();
    const sendFriendMock = vi.fn();
    const cancelFriendMock = vi.fn();
    const acceptFriendMock = vi.fn();

    vi.mocked(hooks.useSendFriendRequestMutation).mockReturnValue({
      mutate: sendFriendMock,
      isPending: false,
    } as never);
    vi.mocked(hooks.useCancelFriendRequestMutation).mockReturnValue({
      mutate: cancelFriendMock,
      isPending: false,
    } as never);
    vi.mocked(hooks.useAcceptFriendRequestMutation).mockReturnValue({
      mutate: acceptFriendMock,
      isPending: false,
    } as never);

    const mockGroup: Group = createMockGroup({ id: "grp-1" });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [mockGroup] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [
        { userId: "user-123", role: "owner", joinedAt: 100 },
        { userId: "user-add", role: "member", joinedAt: 200 },
        { userId: "user-sent", role: "member", joinedAt: 200 },
        { userId: "user-recv", role: "member", joinedAt: 200 },
      ],
      isLoading: false,
    } as never);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [
        { uid: "user-123", username: "currentuser" } as never,
        { uid: "user-add", username: "AddUser" } as never,
        { uid: "user-sent", username: "SentUser" } as never,
        { uid: "user-recv", username: "RecvUser" } as never,
      ],
      isLoading: false,
    } as never);

    vi.mocked(hooks.useGetSentFriendRequestRealtimeQuery).mockReturnValue({
      data: [{ receiverUid: "user-sent" } as never],
    } as never);

    vi.mocked(hooks.useGetReceivedFriendRequestRealtimeQuery).mockReturnValue({
      data: [{ senderUid: "user-recv" } as never],
    } as never);

    renderWithProviders(<GroupDetailsView />);

    // Add friend
    const addFriendBtn = screen.getByRole("button", { name: "groupDetails.addFriend" });
    await user.click(addFriendBtn);
    expect(sendFriendMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "user-add", username: "AddUser" })
    );

    // Cancel friend request
    const cancelFriendBtn = screen.getByRole("button", { name: "groupDetails.cancelRequest" });
    await user.click(cancelFriendBtn);
    expect(cancelFriendMock).toHaveBeenCalledWith("user-sent");

    // Accept friend request
    const acceptFriendBtn = screen.getByRole("button", { name: "groupDetails.acceptRequest" });
    await user.click(acceptFriendBtn);
    expect(acceptFriendMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "user-recv", username: "RecvUser" })
    );
  });

  it("identifies existing friends and opens invite friends modal", async () => {
    const user = userEvent.setup();
    const mockGroup: Group = createMockGroup({ id: "grp-1", ownerId: "user-123" });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [mockGroup] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [{ uid: "user-already-friend" } as never],
    } as never);
    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [
        { userId: "user-123", role: "owner", joinedAt: 100 },
        { userId: "user-already-friend", role: "member", joinedAt: 200 },
      ],
      isLoading: false,
    } as never);
    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [
        { uid: "user-123", username: "currentuser" } as never,
        { uid: "user-already-friend", username: "AlreadyFriend" } as never,
      ],
      isLoading: false,
    } as never);

    renderWithProviders(<GroupDetailsView />);

    // Check back button navigates to /community/groups
    const backBtn = screen.getByText("groupDetails.backToList").closest("div")?.querySelector("button");
    expect(backBtn).not.toBeNull();
    if (backBtn) {
      await user.click(backBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/community/groups");
    }

    // Check invite friends button opens invite modal
    const inviteBtn = screen.getByRole("button", { name: /manageGroupSheet\.inviteFriends/i });
    await user.click(inviteBtn);
    expect(screen.getByTestId("invite-modal")).toBeInTheDocument();
  });

  it("handles unauthenticated user attempting to join or leave", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      claims: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
    });

    const joinMutationMock = vi.fn();
    vi.mocked(hooks.useAddGroupMemberMutation).mockReturnValue({
      mutateAsync: joinMutationMock,
      isPending: false,
    } as never);

    const mockGroup: Group = createMockGroup({ id: "grp-1", type: "public", requiresApproval: false });
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: mockGroup, isLoading: false } as never);
    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({ data: [], isLoading: false } as never);

    renderWithProviders(<GroupDetailsView />);

    const joinBtn = screen.getByRole("button", { name: "groupDetails.joinGroup" });
    await user.click(joinBtn);
    expect(joinMutationMock).not.toHaveBeenCalled();

    // Test unauthenticated request to join
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      claims: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
    });
    const requestJoinMutationMock = vi.fn();
    vi.mocked(hooks.useRequestJoinGroupMutation).mockReturnValue({
      mutateAsync: requestJoinMutationMock,
      isPending: false,
    } as never);
    const approvalGroup = createMockGroup({ id: "grp-1", type: "public", requiresApproval: true });
    vi.mocked(hooks.useGetGroupQuery).mockReturnValue({ data: approvalGroup, isLoading: false } as never);

    renderWithProviders(<GroupDetailsView />);
    const requestBtn = screen.getByRole("button", { name: "groupDetails.requestToJoin" });
    await user.click(requestBtn);
    expect(requestJoinMutationMock).not.toHaveBeenCalled();

    // Test unauthenticated leave group
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      claims: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
    });
    const leaveMutationMock = vi.fn();
    vi.mocked(hooks.useRemoveGroupMemberMutation).mockReturnValue({
      mutateAsync: leaveMutationMock,
      isPending: false,
    } as never);
    vi.mocked(hooks.useGetUserGroupsQuery).mockReturnValue({ data: [approvalGroup] } as never);
    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [{ userId: "another-user", role: "member", joinedAt: 100 }],
      isLoading: false,
    } as never);

    renderWithProviders(<GroupDetailsView />);
    const moreBtn = screen.getByLabelText("groupDetails.moreOptions");
    await user.click(moreBtn);
    const leaveItem = screen.getByText("groupDetails.leaveGroup");
    await user.click(leaveItem);
    const confirmLeaveBtn = screen.getByRole("button", { name: "groupDetails.confirmLeaveBtn" });
    await user.click(confirmLeaveBtn);
    expect(leaveMutationMock).not.toHaveBeenCalled();

    vi.mocked(useAuth).mockReturnValue({ user: { uid: "user-123", username: "currentuser" } } as never);
  });
});

