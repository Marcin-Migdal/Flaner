import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useGetReceivedFriendRequestRealtimeQuery } from "./useGetReceivedFriendRequestRealtimeQuery";
import * as usersApi from "../../../../api/users";
import type { FriendRequest } from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/users", () => ({
  getReceivedFriendRequests: vi.fn(),
  subscribeToReceivedFriendRequests: vi.fn(),
}));

describe("useGetReceivedFriendRequestRealtimeQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("subscribes to received friend requests and cleans up subscription", async () => {
    const mockRequests: FriendRequest[] = [
      {
        id: "req-1",
        senderUid: "u-99",
        receiverUid: "user-123",
        senderUsername: "alice",
        senderAvatarUrl: "",
        receiverUsername: "bob",
        receiverAvatarUrl: "",
        status: "pending",
        createdAt: 100,
      },
    ];

    const unsubscribeMock = vi.fn();
    vi.mocked(usersApi.subscribeToReceivedFriendRequests).mockImplementation((_uid, cb) => {
      cb(mockRequests);
      return unsubscribeMock;
    });
    const { result, unmount } = renderHookWithProviders(() => useGetReceivedFriendRequestRealtimeQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.data).toEqual(mockRequests));

    expect(usersApi.subscribeToReceivedFriendRequests).toHaveBeenCalledWith(
      "user-123",
      expect.any(Function),
      expect.any(Function),
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("does not subscribe when enabled is false", () => {
    renderHookWithProviders(() => useGetReceivedFriendRequestRealtimeQuery({ enabled: false }), { user: mockUser });

    expect(usersApi.subscribeToReceivedFriendRequests).not.toHaveBeenCalled();
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useGetReceivedFriendRequestRealtimeQuery(), { user: null });

    expect(usersApi.subscribeToReceivedFriendRequests).not.toHaveBeenCalled();
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes queryFn on refetch for authenticated user", async () => {
    const mockRequests: FriendRequest[] = [
      {
        id: "req-2",
        senderUid: "u-100",
        receiverUid: "user-123",
        senderUsername: "dan",
        senderAvatarUrl: "",
        receiverUsername: "bob",
        receiverAvatarUrl: "",
        status: "pending",
        createdAt: 200,
      },
    ];
    vi.mocked(usersApi.getReceivedFriendRequests).mockResolvedValueOnce(mockRequests);
    vi.mocked(usersApi.subscribeToReceivedFriendRequests).mockReturnValue(vi.fn());
    const { result } = renderHookWithProviders(() => useGetReceivedFriendRequestRealtimeQuery(), { user: mockUser });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual(mockRequests);
    expect(usersApi.getReceivedFriendRequests).toHaveBeenCalledWith("user-123");
  });
});

