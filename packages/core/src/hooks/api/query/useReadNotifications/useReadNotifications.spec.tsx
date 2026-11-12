import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useReadNotifications } from "./useReadNotifications";
import * as notificationsApi from "../../../../api/notifications";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/notifications", () => ({
  getReadNotificationsPage: vi.fn(),
}));

describe("useReadNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const { result, queryClient } = renderHookWithProviders(() => useReadNotifications(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notificationsApi.getReadNotificationsPage).toHaveBeenCalledWith("user-123", 15, undefined);
    expect(result.current.data?.pages[0]).toEqual(mockPage);
    expect(queryClient.getQueryState(["notifications", "read", "user-123"])?.status).toBe("success");
  });

  it("throws error in queryFn when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useReadNotifications(), { user: null });

    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });
});
