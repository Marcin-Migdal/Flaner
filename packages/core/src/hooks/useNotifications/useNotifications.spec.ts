import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "./useNotifications";
import * as notificationsApi from "../../api/notifications";
import type { AppNotification } from "../../api/notifications";

const invalidateMock = vi.fn();
let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../api/query/useReadNotifications", () => ({
  useInvalidateReadNotificationsQuery: () => invalidateMock,
}));

vi.mock("../../api/notifications", () => ({
  subscribeToNotifications: vi.fn(),
  deleteNotifications: vi.fn().mockResolvedValue(undefined),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

const mockNotifications: AppNotification[] = [
  {
    id: "notif-1",
    senderUid: "user-2",
    senderUsername: "Alice",
    senderAvatarUrl: "https://example.com/avatar.jpg",
    read: false,
    createdAt: 1700000000000,
    type: "group_invitation",
  },
  {
    id: "notif-2",
    senderUid: "user-3",
    senderUsername: "Bob",
    senderAvatarUrl: "https://example.com/avatar2.jpg",
    read: true,
    createdAt: 1700000000000,
    type: "friend_request_accepted",
  },
];

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.subscribeToNotifications).mockReset();
    vi.mocked(notificationsApi.subscribeToNotifications).mockReturnValue(vi.fn());
    mockUser = { uid: "user-123" };
  });

  it("subscribes to notifications when user is authenticated", () => {
    const unsubscribeMock = vi.fn();
    let listenerCallback: (notifs: AppNotification[]) => void = () => {};

    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return unsubscribeMock;
    });

    const { result, unmount } = renderHook(() => useNotifications());

    expect(notificationsApi.subscribeToNotifications).toHaveBeenCalledWith("user-123", expect.any(Function));
    expect(result.current.loading).toBe(true);

    act(() => {
      listenerCallback(mockNotifications);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.loading).toBe(false);

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("handles unauthenticated user cleanly", () => {
    mockUser = null;
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(notificationsApi.subscribeToNotifications).not.toHaveBeenCalled();
  });

  it("marks single notification as read optimistically and triggers API", async () => {
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      cb(mockNotifications);
      return vi.fn();
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead("notif-1");
    });

    expect(notificationsApi.markNotificationAsRead).toHaveBeenCalledWith("user-123", "notif-1");
    expect(invalidateMock).toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].read).toBe(true);
  });

  it("marks all notifications as read optimistically and triggers API", async () => {
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      cb(mockNotifications);
      return vi.fn();
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(notificationsApi.markAllNotificationsAsRead).toHaveBeenCalledWith("user-123");
    expect(invalidateMock).toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("handles user change dynamically (logout and login)", () => {
    mockUser = { uid: "user-1" };
    const { result, rerender } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);

    // Logout
    mockUser = null;
    rerender();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);

    // Login with new user
    mockUser = { uid: "user-2" };
    rerender();
    expect(result.current.loading).toBe(true);
  });

  it("guards against calling markAsRead or markAllAsRead when unauthenticated or unreadCount is 0", async () => {
    mockUser = null;
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead("some-id");
      await result.current.markAllAsRead();
    });

    expect(notificationsApi.markNotificationAsRead).not.toHaveBeenCalled();
    expect(notificationsApi.markAllNotificationsAsRead).not.toHaveBeenCalled();
  });

  it("handles errors during markAsRead and markAllAsRead gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      cb(mockNotifications);
      return vi.fn();
    });
    vi.mocked(notificationsApi.markNotificationAsRead).mockRejectedValueOnce(new Error("Fail read"));
    vi.mocked(notificationsApi.markAllNotificationsAsRead).mockRejectedValueOnce(new Error("Fail all read"));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead("notif-1");
      await result.current.markAllAsRead();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to mark as read", expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to mark all as read", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("removes the other unread notifications of a group once its group_deleted notification arrives", () => {
    let listenerCallback: (notifs: AppNotification[]) => void = () => {};
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return vi.fn();
    });
    const base = { senderUid: "u2", senderUsername: "U2", senderAvatarUrl: "", read: false, createdAt: 1 };

    renderHook(() => useNotifications());
    act(() => {
      listenerCallback([
        { ...base, id: "deleted", type: "group_deleted", groupId: "g1" },
        { ...base, id: "accepted", type: "group_invitation_accepted", groupId: "g1" },
        { ...base, id: "friend", type: "friend_request" },
      ]);
    });

    expect(notificationsApi.deleteNotifications).toHaveBeenCalledWith("user-123", ["accepted"]);
  });

  it("does not delete anything without a group_deleted notification", () => {
    let listenerCallback: (notifs: AppNotification[]) => void = () => {};
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return vi.fn();
    });

    renderHook(() => useNotifications());
    act(() => listenerCallback(mockNotifications));

    expect(notificationsApi.deleteNotifications).not.toHaveBeenCalled();
  });
});

