import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetFriendsListRealtimeQuery } from "./useGetFriendsListRealtimeQuery";
import * as usersApi from "../../../api/users";
import type { Friendship } from "../../../api/users";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/users", () => ({
  getFriendsList: vi.fn(),
  subscribeToFriendsList: vi.fn(),
}));

describe("useGetFriendsListRealtimeQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("subscribes to realtime updates and sets query data", async () => {
    const mockFriends: Friendship[] = [
      { uid: "f-1", username: "Friend1", usernameLower: "friend1", createdAt: 100, userRef: {} as never },
    ];
    const unsubscribeMock = vi.fn();

    vi.mocked(usersApi.getFriendsList).mockResolvedValueOnce(mockFriends);
    vi.mocked(usersApi.subscribeToFriendsList).mockImplementation((_uid, cb) => {
      cb(mockFriends);
      return unsubscribeMock;
    });

    const { Wrapper } = createWrapper();
    const { result, unmount } = renderHook(() => useGetFriendsListRealtimeQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(mockFriends));

    expect(usersApi.subscribeToFriendsList).toHaveBeenCalledWith("user-123", expect.any(Function));

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
