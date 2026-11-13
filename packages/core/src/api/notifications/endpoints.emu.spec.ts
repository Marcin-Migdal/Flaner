// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { AppNotification } from "@flaner/shared/api";
import { setupEmulator } from "@flaner/test-utils/emulator";
import {
  deleteNotifications,
  getReadNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const DENIED = { code: "permission-denied" };

const notification = (id: string, overrides: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: "friend_request_accepted",
  senderUid: "user-2",
  senderUsername: "Bob",
  senderAvatarUrl: "",
  createdAt: 1,
  read: false,
  ...overrides,
});

const seedInbox = (uid: string, notifications: AppNotification[]) =>
  seed(Object.fromEntries(notifications.map((n) => [`users/${uid}/notifications/${n.id}`, n])));

describe("core notifications endpoints", () => {
  describe("subscribeToNotifications", () => {
    it("lists unread notifications newest first; only later additions count as added", async () => {
      await seedInbox("user-1", [
        notification("old", { createdAt: 1 }),
        notification("read", { createdAt: 3, read: true }),
        notification("newer", { createdAt: 2 }),
      ]);
      await signInAs("user-1");
      const onUpdate = vi.fn<(all: AppNotification[], added: AppNotification[]) => void>();

      const unsubscribe = subscribeToNotifications("user-1", onUpdate, vi.fn());
      await vi.waitFor(() => expect(onUpdate).toHaveBeenCalled());
      expect(onUpdate.mock.lastCall?.[0].map((n) => n.id)).toEqual(["newer", "old"]);
      expect(onUpdate.mock.calls.flatMap(([, added]) => added)).toEqual([]);

      await seedInbox("user-1", [notification("incoming", { createdAt: 4 })]);

      await vi.waitFor(() => expect(onUpdate.mock.lastCall?.[1].map((n) => n.id)).toEqual(["incoming"]));
      expect(onUpdate.mock.lastCall?.[0].map((n) => n.id)).toEqual(["incoming", "newer", "old"]);
      unsubscribe();
    });

    it("passes a denied listener (someone else's inbox) to onError", async () => {
      await signInAs("user-2");
      const onError = vi.fn();

      const unsubscribe = subscribeToNotifications("user-1", vi.fn(), onError);

      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining(DENIED)));
      unsubscribe();
    });
  });

  it("markNotificationAsRead marks one notification read", async () => {
    await seedInbox("user-1", [notification("n-1"), notification("n-2")]);
    await signInAs("user-1");

    await markNotificationAsRead("user-1", "n-1");

    expect(await read("users/user-1/notifications/n-1")).toMatchObject({ read: true });
    expect(await read("users/user-1/notifications/n-2")).toMatchObject({ read: false });
  });

  it("markNotificationAsRead is denied in someone else's inbox", async () => {
    await seedInbox("user-1", [notification("n-1")]);
    await signInAs("user-2");

    await expect(markNotificationAsRead("user-1", "n-1")).rejects.toMatchObject(DENIED);
  });

  it("markAllNotificationsAsRead marks every unread notification read, and is a no-op on an empty inbox", async () => {
    await signInAs("user-1");
    await markAllNotificationsAsRead("user-1");
    expect(await list("users/user-1/notifications")).toEqual({});

    await seedInbox("user-1", [notification("n-1"), notification("n-2"), notification("n-3", { read: true })]);
    await markAllNotificationsAsRead("user-1");

    const inbox = await list("users/user-1/notifications");
    expect(Object.values(inbox).map((n) => n.read)).toEqual([true, true, true]);
  });

  it("deleteNotifications deletes the given notifications only", async () => {
    await seedInbox("user-1", [notification("n-1"), notification("n-2"), notification("n-3")]);
    await signInAs("user-1");

    await deleteNotifications("user-1", ["n-1", "n-3"]);

    expect(Object.keys(await list("users/user-1/notifications"))).toEqual(["n-2"]);
  });

  it("getReadNotificationsPage pages read notifications newest first", async () => {
    await seedInbox("user-1", [
      notification("r-1", { read: true, createdAt: 1 }),
      notification("r-2", { read: true, createdAt: 2 }),
      notification("r-3", { read: true, createdAt: 3 }),
      notification("unread", { createdAt: 4 }),
    ]);
    await signInAs("user-1");

    const first = await getReadNotificationsPage("user-1", 2);
    expect(first.notifications.map((n) => n.id)).toEqual(["r-3", "r-2"]);

    const second = await getReadNotificationsPage("user-1", 2, first.nextCursor);
    expect(second.notifications.map((n) => n.id)).toEqual(["r-1"]);
  });
});
