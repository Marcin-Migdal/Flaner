import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@flaner/ui-components";
import { renderWithProviders } from "@flaner/test-utils";
import { FriendsTabContent } from "./FriendsTabContent";
import * as hooks from "../hooks";

vi.mock("../hooks", () => ({
  useGetFriendsListRealtimeQuery: vi.fn(),
  useGetUsersQuery: vi.fn(),
  useRemoveFriendMutation: vi.fn(),
}));

vi.mock("../hooks/useCommunityTranslations", () => ({
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
});
