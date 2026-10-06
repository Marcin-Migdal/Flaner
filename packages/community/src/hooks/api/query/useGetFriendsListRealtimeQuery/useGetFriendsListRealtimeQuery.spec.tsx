import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetFriendsListRealtimeQuery } from "./useGetFriendsListRealtimeQuery";
import * as usersApi from "../../../../api/users";
import type { Friendship } from "../../../../api/users";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/users", () => ({
  getFriendsList: vi.fn(),
  subscribeToFriendsList: vi.fn(),
}));

describe("useGetFriendsListRealtimeQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it("does not subscribe when enabled is false", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useGetFriendsListRealtimeQuery({ enabled: false }), { wrapper: Wrapper });

    expect(usersApi.subscribeToFriendsList).not.toHaveBeenCalled();
  });

  it("handles unauthenticated user", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetFriendsListRealtimeQuery(), { wrapper: Wrapper });

    expect(usersApi.subscribeToFriendsList).not.toHaveBeenCalled();
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes queryFn on refetch for authenticated user", async () => {
    const mockFriends: Friendship[] = [
      { uid: "f-2", username: "Friend2", usernameLower: "friend2", createdAt: 200, userRef: {} as never },
    ];
    vi.mocked(usersApi.getFriendsList).mockResolvedValueOnce(mockFriends);
    vi.mocked(usersApi.subscribeToFriendsList).mockReturnValue(vi.fn());

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetFriendsListRealtimeQuery(), { wrapper: Wrapper });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual(mockFriends);
    expect(usersApi.getFriendsList).toHaveBeenCalledWith("user-123");
  });
});

