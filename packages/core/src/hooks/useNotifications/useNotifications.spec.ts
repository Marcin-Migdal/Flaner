import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { UserType } from "@flaner/shared/types";
import { useNotifications } from "./useNotifications";
import * as notificationsApi from "../../api/notifications";
import type { AppNotification } from "../../api/notifications";

type RenderOptions = Parameters<typeof useNotifications>[0] & { user?: UserType | null };

/** `useNotifications` for `user` (default: signed in as user-123), plus a spy on the query cache invalidation. */
const renderNotifications = ({ user = createMockUser({ uid: "user-123" }), ...options }: RenderOptions = {}) => {
  const rendered = renderHookWithProviders(() => useNotifications(options), { user });
  const invalidateSpy = vi.spyOn(rendered.queryClient, "invalidateQueries");
  return { ...rendered, invalidateSpy };
};

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
  });

  it("subscribes to notifications when user is authenticated", () => {
    const unsubscribeMock = vi.fn();
    let listenerCallback: (notifs: AppNotification[], added: AppNotification[]) => void = () => {};

    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return unsubscribeMock;
    });

    const { result, unmount } = renderNotifications();

    expect(notificationsApi.subscribeToNotifications).toHaveBeenCalledWith("user-123", expect.any(Function), expect.any(Function));
    expect(result.current.loading).toBe(true);

    act(() => {
      listenerCallback(mockNotifications, []);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.loading).toBe(false);

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("handles unauthenticated user cleanly", () => {
    const { result } = renderNotifications({ user: null });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(notificationsApi.subscribeToNotifications).not.toHaveBeenCalled();
  });

  it("marks single notification as read optimistically and triggers API", async () => {
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      cb(mockNotifications, []);
      return vi.fn();
    });

    const { result, invalidateSpy } = renderNotifications();

    await act(async () => {
      await result.current.markAsRead("notif-1");
    });

    expect(notificationsApi.markNotificationAsRead).toHaveBeenCalledWith("user-123", "notif-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications", "read", "user-123"] });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].read).toBe(true);
  });

  it("marks all notifications as read optimistically and triggers API", async () => {
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      cb(mockNotifications, []);
      return vi.fn();
    });

    const { result, invalidateSpy } = renderNotifications();

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(notificationsApi.markAllNotificationsAsRead).toHaveBeenCalledWith("user-123");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications", "read", "user-123"] });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it("handles user change dynamically (logout and login)", () => {
    const { result, rerender, setUser } = renderNotifications({ user: createMockUser({ uid: "user-1" }) });
    expect(result.current.loading).toBe(true);

    // Logout
    setUser(null);
    rerender();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);

    // Login with new user
    setUser(createMockUser({ uid: "user-2" }));
    rerender();
    expect(result.current.loading).toBe(true);
  });

  it("guards against calling markAsRead or markAllAsRead when unauthenticated or unreadCount is 0", async () => {
    const { result } = renderNotifications({ user: null });

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
      cb(mockNotifications, []);
      return vi.fn();
    });
    vi.mocked(notificationsApi.markNotificationAsRead).mockRejectedValueOnce(new Error("Fail read"));
    vi.mocked(notificationsApi.markAllNotificationsAsRead).mockRejectedValueOnce(new Error("Fail all read"));

    const { result } = renderNotifications();

    await act(async () => {
      await result.current.markAsRead("notif-1");
      await result.current.markAllAsRead();
    });

    expect(reportError).toHaveBeenCalledWith(new Error("Fail read"));
    expect(reportError).toHaveBeenCalledWith(new Error("Fail all read"));
    consoleErrorSpy.mockRestore();
  });

  it("removes the other unread notifications of a group once its group_deleted notification arrives", () => {
    let listenerCallback: (notifs: AppNotification[], added: AppNotification[]) => void = () => {};
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return vi.fn();
    });
    const base = { senderUid: "u2", senderUsername: "U2", senderAvatarUrl: "", read: false, createdAt: 1 };

    renderNotifications();
    act(() => {
      listenerCallback([
        { ...base, id: "deleted", type: "group_deleted", groupId: "g1" },
        { ...base, id: "accepted", type: "group_invitation_accepted", groupId: "g1" },
        { ...base, id: "friend", type: "friend_request" },
      ], []);
    });

    expect(notificationsApi.deleteNotifications).toHaveBeenCalledWith("user-123", ["accepted"]);
  });

  it("does not delete anything without a group_deleted notification", () => {
    let listenerCallback: (notifs: AppNotification[], added: AppNotification[]) => void = () => {};
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return vi.fn();
    });

    renderNotifications();
    act(() => listenerCallback(mockNotifications, []));

    expect(notificationsApi.deleteNotifications).not.toHaveBeenCalled();
  });

  it("passes only the notifications that arrived while subscribed to onNew", () => {
    let listenerCallback: (notifs: AppNotification[], added: AppNotification[]) => void = () => {};
    vi.mocked(notificationsApi.subscribeToNotifications).mockImplementation((_uid, cb) => {
      listenerCallback = cb;
      return vi.fn();
    });
    const onNew = vi.fn();

    renderNotifications({ onNew });
    act(() => listenerCallback(mockNotifications, []));
    expect(onNew).not.toHaveBeenCalled();

    act(() => listenerCallback(mockNotifications, [mockNotifications[0]]));
    expect(onNew).toHaveBeenCalledExactlyOnceWith([mockNotifications[0]]);
  });
});
