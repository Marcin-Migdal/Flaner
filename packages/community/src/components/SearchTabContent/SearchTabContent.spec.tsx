import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@flaner/ui-components";
import { renderWithProviders } from "@flaner/test-utils";
import { SearchTabContent } from "./SearchTabContent";
import * as hooks from "../../hooks";

vi.mock("@flaner/shared/hooks", () => ({
  useDebounce: (val: string) => val,
}));

vi.mock("../../hooks", () => ({
  useGetFriendsListRealtimeQuery: vi.fn(),
  useGetSentFriendRequestRealtimeQuery: vi.fn(),
  useGetReceivedFriendRequestRealtimeQuery: vi.fn(),
  useSearchUsersQuery: vi.fn(),
  useSendFriendRequestMutation: vi.fn(),
  useCancelFriendRequestMutation: vi.fn(),
  useAcceptFriendRequestMutation: vi.fn(),
}));

vi.mock("../../hooks/useCommunityTranslations", () => ({
  useCommunityTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("SearchTabContent component", () => {
  const sendMutateMock = vi.fn();
  const cancelMutateMock = vi.fn();
  const acceptMutateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useSendFriendRequestMutation).mockReturnValue({
      mutate: sendMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useSendFriendRequestMutation>);

    vi.mocked(hooks.useCancelFriendRequestMutation).mockReturnValue({
      mutate: cancelMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useCancelFriendRequestMutation>);

    vi.mocked(hooks.useAcceptFriendRequestMutation).mockReturnValue({
      mutate: acceptMutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useAcceptFriendRequestMutation>);

    vi.mocked(hooks.useGetFriendsListRealtimeQuery).mockReturnValue({
      data: [{ uid: "friend-1", username: "Alice", createdAt: 1, userRef: {} as never, usernameLower: "alice" }],
    } as unknown as ReturnType<typeof hooks.useGetFriendsListRealtimeQuery>);

    vi.mocked(hooks.useGetSentFriendRequestRealtimeQuery).mockReturnValue({
      data: [{ receiverUid: "sent-1" } as never],
    } as unknown as ReturnType<typeof hooks.useGetSentFriendRequestRealtimeQuery>);

    vi.mocked(hooks.useGetReceivedFriendRequestRealtimeQuery).mockReturnValue({
      data: [{ senderUid: "recv-1" } as never],
    } as unknown as ReturnType<typeof hooks.useGetReceivedFriendRequestRealtimeQuery>);
  });

  const renderComponent = () =>
    renderWithProviders(
      <Tabs value="search">
        <SearchTabContent />
      </Tabs>
    );

  it("renders search prompt when query is empty", () => {
    vi.mocked(hooks.useSearchUsersQuery).mockReturnValue({
      data: [],
      isFetching: false,
    } as unknown as ReturnType<typeof hooks.useSearchUsersQuery>);

    renderComponent();
    expect(screen.getByText("search")).toBeInTheDocument();
  });

  it("renders search results with friend, sent, received, and add actions", async () => {
    const user = userEvent.setup();
    const mockUsers = [
      { uid: "friend-1", username: "Alice", email: "alice@test.com" },
      { uid: "sent-1", username: "Bob", email: "bob@test.com" },
      { uid: "recv-1", username: "Charlie", email: "charlie@test.com" },
      { uid: "stranger-1", username: "Dave", email: "dave@test.com" },
    ];

    vi.mocked(hooks.useSearchUsersQuery).mockReturnValue({
      data: mockUsers,
      isFetching: false,
    } as unknown as ReturnType<typeof hooks.useSearchUsersQuery>);

    renderComponent();

    const input = screen.getByPlaceholderText("searchTab.placeholder");
    await user.type(input, "test");

    // Check states:
    // 1. Friend
    expect(screen.getByText("searchTab.isFriend")).toBeInTheDocument();

    // 2. Sent -> cancel button
    const cancelBtn = screen.getByRole("button", { name: "searchTab.cancel" });
    await user.click(cancelBtn);
    expect(cancelMutateMock).toHaveBeenCalledWith("sent-1");

    // 3. Received -> accept button
    const acceptBtn = screen.getByRole("button", { name: "searchTab.accept" });
    await user.click(acceptBtn);
    expect(acceptMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "recv-1", username: "Charlie" })
    );

    // 4. Stranger -> add button
    const addBtn = screen.getByRole("button", { name: "searchTab.add" });
    await user.click(addBtn);
    expect(sendMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "stranger-1", username: "Dave" })
    );

    // Clear search text
    const clearBtn = input.parentElement?.querySelector("button");
    expect(clearBtn).not.toBeNull();
    if (clearBtn) {
      await user.click(clearBtn);
      expect(input).toHaveValue("");
    }
  });

  it("handles empty username with ?? fallback initials", async () => {
    const user = userEvent.setup();
    vi.mocked(hooks.useSearchUsersQuery).mockReturnValue({
      data: [{ uid: "u-anon", username: "", email: "anon@test.com" }],
      isFetching: false,
    } as unknown as ReturnType<typeof hooks.useSearchUsersQuery>);

    renderComponent();
    const input = screen.getByPlaceholderText("searchTab.placeholder");
    await user.type(input, "anon");

    expect(screen.getByText("??")).toBeInTheDocument();
  });
});

