import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { InviteToGroupModal } from "./InviteToGroupModal";
import * as hooks from "../../../hooks";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("@flaner/shared/hooks", () => ({
  useDebounce: (val: string) => val,
}));

vi.mock("../../../hooks", () => ({
  useGetFriendsListQuery: vi.fn(),
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

describe("InviteToGroupModal component", () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useInviteUserToGroupMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useInviteUserToGroupMutation>);

    vi.mocked(hooks.useSearchUsersQuery).mockReturnValue({
      data: [],
      isFetching: false,
    } as unknown as ReturnType<typeof hooks.useSearchUsersQuery>);
  });

  it("renders friend list and shows member, invited, and invite states", async () => {
    const user = userEvent.setup();

    const mockFriends = [
      { uid: "u-member", username: "MemberUser", createdAt: 1, userRef: {} as never, usernameLower: "memberuser" },
      { uid: "u-invited", username: "InvitedUser", createdAt: 1, userRef: {} as never, usernameLower: "inviteduser" },
      { uid: "u-fresh", username: "FreshUser", createdAt: 1, userRef: {} as never, usernameLower: "freshuser" },
    ];

    vi.mocked(hooks.useGetFriendsListQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListQuery>);

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
      />
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
    const { useAuth } = await import("@flaner/shared/context");
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    const user = userEvent.setup();
    const mockFriends = [
      { uid: "u-fresh", username: "FreshUser", createdAt: 1, userRef: {} as never, usernameLower: "freshuser" },
    ];

    vi.mocked(hooks.useGetFriendsListQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListQuery>);

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
      />
    );

    const inviteBtn = screen.getByRole("button", { name: "inviteToGroup.inviteBtn" });
    await user.click(inviteBtn);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("renders loading indicator when friends are loading", () => {
    vi.mocked(hooks.useGetFriendsListQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListQuery>);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("inviteToGroup.loading")).toBeInTheDocument();
  });

  it("handles user without username and displays ?? initials", () => {
    vi.mocked(hooks.useGetFriendsListQuery).mockReturnValue({
      data: [{ uid: "u-anon", username: "", createdAt: 1, userRef: {} as never, usernameLower: "" }],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListQuery>);

    renderWithProviders(
      <InviteToGroupModal
        groupId="grp-1"
        groupName="Test Group"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("??")).toBeInTheDocument();
  });
});

