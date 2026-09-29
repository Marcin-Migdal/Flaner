import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetSentFriendRequestRealtimeQuery } from "./useGetSentFriendRequestRealtimeQuery";
import * as usersApi from "../../../api/users";
import type { FriendRequest } from "../../../api/users";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/users", () => ({
  getSentFriendRequests: vi.fn(),
  subscribeToSentFriendRequests: vi.fn(),
}));

describe("useGetSentFriendRequestRealtimeQuery", () => {
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
    vi.mocked(usersApi.getSentFriendRequests).mockResolvedValueOnce(mockRequests);
    vi.mocked(usersApi.subscribeToSentFriendRequests).mockImplementation((_uid, cb) => {
      cb(mockRequests);
      return unsubscribeMock;
    });

    const { Wrapper } = createWrapper();
    const { result, unmount } = renderHook(() => useGetSentFriendRequestRealtimeQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(mockRequests));

    expect(usersApi.subscribeToSentFriendRequests).toHaveBeenCalledWith(
      "user-123",
      expect.any(Function)
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
