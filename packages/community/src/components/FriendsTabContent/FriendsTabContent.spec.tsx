import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@flaner/ui-components";
import { renderWithProviders } from "@flaner/test-utils";
import { FriendsTabContent } from "./FriendsTabContent";
import * as hooks from "../../hooks";

vi.mock("../../hooks", () => ({
  useGetFriendsListRealtimeQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useRemoveFriendMutation: vi.fn(),
}));

vi.mock("@flaner/ui-components", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    ConfirmationPopup: ({
      open,
      onConfirm,
      onOpenChange,
      title,
    }: {
      open: boolean;
      onConfirm: () => void;
      onOpenChange: (open: boolean) => void;
      title: string;
    }) => {
      return (
        <div>
          {open && (
            <div>
              <span>{title}</span>
              <button onClick={onConfirm}>friendsList.removeConfirmBtn</button>
              <button onClick={() => onOpenChange(false)}>groupDetails.cancelBtn</button>
            </div>
          )}
          <button data-testid="force-confirm-when-closed" onClick={onConfirm}>Force Confirm</button>
        </div>
      );
    },
  };
});

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.name) return `${key}:${params.name}`;
      return key;
    },
    i18n: { language: "en" },
  }),
}));

describe("FriendsTabContent component", () => {
  const mutateAsyncMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useRemoveFriendMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      variables: undefined,
    } as unknown as ReturnType<typeof hooks.useRemoveFriendMutation>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);
  });

  const renderComponent = () =>
    renderWithProviders(
      <Tabs value="friends">
        <FriendsTabContent />
      </Tabs>
    );

  it("renders empty state when user has no friends", () => {
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    renderComponent();

    expect(screen.getByText("friendsList.empty")).toBeInTheDocument();
  });

  it("renders list of friends and allows filtering by username", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      {
        uid: "f-1",
        username: "Alice",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "alice",
      },
      {
        uid: "f-2",
        username: "Bob",
        createdAt: 2000,
        userRef: {} as never,
        usernameLower: "bob",
      },
    ];

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    renderComponent();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("friendsList.placeholder");
    await user.type(input, "Ali");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("opens remove confirmation dialog and calls remove mutation on confirm", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      {
        uid: "f-1",
        username: "Alice",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "alice",
      },
    ];

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);
    mutateAsyncMock.mockResolvedValueOnce(undefined);

    renderComponent();

    const removeBtn = screen.getByRole("button", { name: "friendsList.remove" });
    await user.click(removeBtn);

    expect(screen.getByText("friendsList.removeConfirmTitle")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "friendsList.removeConfirmBtn" });
    await user.click(confirmBtn);

    expect(mutateAsyncMock).toHaveBeenCalledWith("f-1");
  });

  it("clears search filter and cancels remove dialog", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      {
        uid: "f-1",
        username: "",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "",
      },
    ];

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    vi.mocked(hooks.useGetUsersQuery).mockReturnValue({
      data: [{ uid: "f-1", avatarUrl: "avatar.jpg" } as never],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetUsersQuery>);

    renderComponent();

    // Check ?? fallback initials
    expect(screen.getByText("??")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("friendsList.placeholder");
    await user.type(input, "something");
    expect(input).toHaveValue("something");

    const clearBtn = input.parentElement?.querySelector("button");
    expect(clearBtn).not.toBeNull();
    if (clearBtn) {
      await user.click(clearBtn);
      expect(input).toHaveValue("");
    }

    // Open remove dialog and cancel it
    const removeBtn = screen.getByRole("button", { name: "friendsList.remove" });
    await user.click(removeBtn);

    const cancelBtn = screen.getByRole("button", { name: "groupDetails.cancelBtn" });
    await user.click(cancelBtn);

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("does nothing when confirmation is triggered without a selected friendToRemove", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    renderComponent();

    const forceBtn = screen.getByTestId("force-confirm-when-closed");
    await user.click(forceBtn);

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("handles remove mutation failure gracefully", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      {
        uid: "f-1",
        username: "Alice",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "alice",
      },
    ];

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);
    mutateAsyncMock.mockRejectedValueOnce(new Error("Failed to delete"));

    renderComponent();

    const removeBtn = screen.getByRole("button", { name: "friendsList.remove" });
    await user.click(removeBtn);

    const confirmBtn = screen.getByRole("button", { name: "friendsList.removeConfirmBtn" });
    await user.click(confirmBtn);

    expect(mutateAsyncMock).toHaveBeenCalledWith("f-1");
  });

  it("renders loader when friends list is loading", () => {
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    renderComponent();
    expect(screen.queryByText("friendsList.empty")).not.toBeInTheDocument();
  });

  it("shows search empty state when filterQuery yields no matches", async () => {
    const user = userEvent.setup();
    const mockFriends = [
      {
        uid: "f-1",
        username: "Alice",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "alice",
      },
    ];
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    renderComponent();
    const input = screen.getByPlaceholderText("friendsList.placeholder");
    await user.type(input, "NonExistentUser");

    expect(screen.getByText("searchTab.empty")).toBeInTheDocument();
  });

  it("shows loader icon on remove button when delete is pending for that friend", () => {
    const mockFriends = [
      {
        uid: "f-1",
        username: "Alice",
        createdAt: 1000,
        userRef: {} as never,
        usernameLower: "alice",
      },
    ];
    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: mockFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);
    vi.mocked(hooks.useRemoveFriendMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: true,
      variables: "f-1",
    } as unknown as ReturnType<typeof hooks.useRemoveFriendMutation>);

    renderComponent();
    expect(screen.queryByText("friendsList.remove")).not.toBeInTheDocument();
  });
});

