import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockUser } from "@flaner/test-utils";
import { InviteToGroupModal } from "./InviteToGroupModal";
import * as hooks from "../../../hooks";


vi.mock("@flaner/shared/hooks", () => ({
  useDebounce: (val: string) => val,
}));

vi.mock("../../../hooks", () => ({
  useGetFriendsListRealtimeQuery: vi.fn(),
  useGetUsersRealtimeQuery: vi.fn(),
  useSearchUsersQuery: vi.fn(),
  useGetGroupMembersQuery: vi.fn(),
  useGetGroupPendingInvitationsQuery: vi.fn(),
  useInviteUserToGroupMutation: vi.fn(),
}));

vi.mock("../../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const currentUser = createMockUser({ uid: "user-123" });

describe("InviteToGroupModal component", () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useInviteUserToGroupMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useInviteUserToGroupMutation>);

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    vi.mocked(hooks.useSearchUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useSearchUsersQuery>);
  });

  it("renders friend list and shows member, invited, and invite states", async () => {
    const user = userEvent.setup();

    const mockFriends = [
      { uid: "u-member", username: "MemberUser", usernameLower: "memberuser" },
      { uid: "u-invited", username: "InvitedUser", usernameLower: "inviteduser" },
      { uid: "u-fresh", username: "FreshUser", usernameLower: "freshuser" },
    ];

    vi.mocked(hooks.useGetUsersRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersRealtimeQuery>);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [{ userId: "u-member", role: "member", joinedAt: 100 }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetGroupPendingInvitationsQuery).mockReturnValue({
      data: [
        {
          groupId: "grp-1",
          groupName: "Test Group",
          userId: "u-invited",
          invitedByUserId: "user-123",
          invitedAt: 100,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupPendingInvitationsQuery>);

    mutateAsyncMock.mockResolvedValueOnce(undefined);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { user: currentUser }
    );

    expect(screen.getByText("MemberUser")).toBeInTheDocument();
    expect(screen.getByText("inviteToGroup.alreadyMember")).toBeInTheDocument();

    expect(screen.getByText("InvitedUser")).toBeInTheDocument();
    expect(screen.getByText("inviteToGroup.invitedBtn")).toBeInTheDocument();

    expect(screen.getByText("FreshUser")).toBeInTheDocument();
    const inviteBtn = screen.getByRole("button", { name: "inviteToGroup.inviteBtn" });
    await user.click(inviteBtn);

    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        userId: "u-fresh",
        invitedByUserId: "user-123",
      })
    );

    // Search and clear
    const searchInput = screen.getByPlaceholderText("inviteToGroup.search");
    await user.type(searchInput, "Fresh");
    expect(searchInput).toHaveValue("Fresh");

    const clearBtn = searchInput.parentElement?.querySelector("button");
    expect(clearBtn).not.toBeNull();
    if (clearBtn) {
      await user.click(clearBtn);
      expect(searchInput).toHaveValue("");
    }
  });

  it("does not invite when user is unauthenticated", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      { uid: "u-fresh", username: "FreshUser", usernameLower: "freshuser" },
    ];

    vi.mocked(hooks.useGetUsersRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersRealtimeQuery>);

    vi.mocked(hooks.useGetGroupMembersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupMembersQuery>);

    vi.mocked(hooks.useGetGroupPendingInvitationsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetGroupPendingInvitationsQuery>);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { user: null }
    );

    const inviteBtn = screen.getByRole("button", { name: "inviteToGroup.inviteBtn" });
    await user.click(inviteBtn);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("renders loading indicator when friends are loading", () => {
    vi.mocked(hooks.useGetUsersRealtimeQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetUsersRealtimeQuery>);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { user: currentUser }
    );

    expect(screen.getByText("inviteToGroup.loading")).toBeInTheDocument();
  });

  it("handles user without username and displays ?? initials", () => {
    vi.mocked(hooks.useGetUsersRealtimeQuery).mockReturnValue({
      data: [{ uid: "u-anon", username: "", usernameLower: "" }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersRealtimeQuery>);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { user: currentUser }
    );

    expect(screen.getByText("??")).toBeInTheDocument();
  });
});

