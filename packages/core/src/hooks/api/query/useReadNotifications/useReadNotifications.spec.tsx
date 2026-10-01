import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useReadNotifications, useInvalidateReadNotificationsQuery, getReadNotificationsQueryKeys } from "./useReadNotifications";
import * as notificationsApi from "../../../../api/notifications";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/notifications", () => ({
  getReadNotificationsPage: vi.fn(),
}));

describe("useReadNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { uid: "user-123" };
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches read notifications page when authenticated", async () => {
    const mockPage = {
      notifications: [
        {
          id: "notif-read-1",
          senderUid: "sender-1",
          senderUsername: "Alice",
          senderAvatarUrl: "https://example.com/avatar.jpg",
          read: true,
          createdAt: 1700000000000,
          type: "group_invitation" as const,
        },
      ],
      nextCursor: undefined,
    };

    vi.mocked(notificationsApi.getReadNotificationsPage).mockResolvedValueOnce(mockPage);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReadNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notificationsApi.getReadNotificationsPage).toHaveBeenCalledWith("user-123", 15, undefined);
    expect(result.current.data?.pages[0]).toEqual(mockPage);
  });

  it("invalidates read notifications query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateReadNotificationsQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getReadNotificationsQueryKeys("user-123"),
    });
  });

  it("throws error in queryFn when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReadNotifications(), { wrapper: Wrapper });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });
});
