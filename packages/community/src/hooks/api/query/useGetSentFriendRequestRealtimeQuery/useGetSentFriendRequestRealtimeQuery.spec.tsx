import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useGetSentFriendRequestRealtimeQuery } from "./useGetSentFriendRequestRealtimeQuery";
import * as usersApi from "../../../../api/users";
import type { FriendRequest } from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/users", () => ({
  getSentFriendRequests: vi.fn(),
  subscribeToSentFriendRequests: vi.fn(),
}));

describe("useGetSentFriendRequestRealtimeQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("subscribes to sent friend requests and cleans up subscription", async () => {
    const mockRequests: FriendRequest[] = [
      {
        id: "req-sent-1",
        senderUid: "user-123",
        receiverUid: "user-456",
        senderUsername: "me",
        senderAvatarUrl: "",
        receiverUsername: "them",
        receiverAvatarUrl: "",
        status: "pending",
        createdAt: 200,
      },
    ];

    const unsubscribeMock = vi.fn();
    vi.mocked(usersApi.subscribeToSentFriendRequests).mockImplementation((_uid, cb) => {
      cb(mockRequests);
      return unsubscribeMock;
    });
    const { result, unmount } = renderHookWithProviders(() => useGetSentFriendRequestRealtimeQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.data).toEqual(mockRequests));

    expect(usersApi.subscribeToSentFriendRequests).toHaveBeenCalledWith(
      "user-123",
      expect.any(Function),
      expect.any(Function),
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("does not subscribe when enabled is false", () => {
    renderHookWithProviders(() => useGetSentFriendRequestRealtimeQuery({ enabled: false }), { user: mockUser });

    expect(usersApi.subscribeToSentFriendRequests).not.toHaveBeenCalled();
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useGetSentFriendRequestRealtimeQuery(), { user: null });

    expect(usersApi.subscribeToSentFriendRequests).not.toHaveBeenCalled();
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes queryFn on refetch for authenticated user", async () => {
    const mockRequests: FriendRequest[] = [
      {
        id: "req-sent-2",
        senderUid: "user-123",
        receiverUid: "user-789",
        senderUsername: "me",
        senderAvatarUrl: "",
        receiverUsername: "another",
        receiverAvatarUrl: "",
        status: "pending",
        createdAt: 300,
      },
    ];
    vi.mocked(usersApi.getSentFriendRequests).mockResolvedValueOnce(mockRequests);
    vi.mocked(usersApi.subscribeToSentFriendRequests).mockReturnValue(vi.fn());
    const { result } = renderHookWithProviders(() => useGetSentFriendRequestRealtimeQuery(), { user: mockUser });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual(mockRequests);
    expect(usersApi.getSentFriendRequests).toHaveBeenCalledWith("user-123");
  });
});

