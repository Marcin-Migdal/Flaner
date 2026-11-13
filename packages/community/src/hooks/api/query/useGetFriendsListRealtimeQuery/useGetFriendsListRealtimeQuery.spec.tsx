import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useGetFriendsListRealtimeQuery } from "./useGetFriendsListRealtimeQuery";
import * as usersApi from "../../../../api/users";
import type { Friendship } from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/users", () => ({
  getFriendsList: vi.fn(),
  subscribeToFriendsList: vi.fn(),
}));

describe("useGetFriendsListRealtimeQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("subscribes to realtime updates and sets query data", async () => {
    const mockFriends: Friendship[] = [
      { uid: "f-1", createdAt: 100 },
    ];
    const unsubscribeMock = vi.fn();

    vi.mocked(usersApi.subscribeToFriendsList).mockImplementation((_uid, cb) => {
      cb(mockFriends);
      return unsubscribeMock;
    });
    const { result, unmount } = renderHookWithProviders(() => useGetFriendsListRealtimeQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.data).toEqual(mockFriends));

    expect(usersApi.subscribeToFriendsList).toHaveBeenCalledWith("user-123", expect.any(Function), expect.any(Function));

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("does not subscribe when enabled is false", () => {
    renderHookWithProviders(() => useGetFriendsListRealtimeQuery({ enabled: false }), { user: mockUser });

    expect(usersApi.subscribeToFriendsList).not.toHaveBeenCalled();
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useGetFriendsListRealtimeQuery(), { user: null });

    expect(usersApi.subscribeToFriendsList).not.toHaveBeenCalled();
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes queryFn on refetch for authenticated user", async () => {
    const mockFriends: Friendship[] = [
      { uid: "f-2", createdAt: 200 },
    ];
    vi.mocked(usersApi.getFriendsList).mockResolvedValueOnce(mockFriends);
    vi.mocked(usersApi.subscribeToFriendsList).mockReturnValue(vi.fn());
    const { result } = renderHookWithProviders(() => useGetFriendsListRealtimeQuery(), { user: mockUser });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual(mockFriends);
    expect(usersApi.getFriendsList).toHaveBeenCalledWith("user-123");
  });
});

