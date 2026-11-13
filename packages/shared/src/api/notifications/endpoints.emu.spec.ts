// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import { runTransaction, writeBatch } from "firebase/firestore";
import { fb } from "../../firebase";
import {
  createNotification,
  deleteIfUnread,
  getNotificationSender,
  getUnreadNotificationRefs,
  sourceNotificationRef,
} from "./endpoints";
import type { NotificationContent } from "./types";

const { signInAs, seed, read, list } = setupEmulator();

const alice = { uid: "user-1", username: "Alice", avatarUrl: "alice.png" };

/** Writes the notification as the signed-in sender, like the app's batches do (the rules check it). */
const send = async (recipientId: string, content: NotificationContent, sender: { uid: string; username: string; avatarUrl?: string } = alice) => {
  const notification = createNotification(recipientId, sender, content);
  const batch = writeBatch(fb.firestore);
  batch.set(notification.ref, notification.data);
  await batch.commit();
  return notification.ref.id;
};

const unread = (id: string, senderUid = "user-1") => ({
  id,
  type: "friend_request",
  senderUid,
  senderUsername: "Alice",
  senderAvatarUrl: "",
  createdAt: 1,
  read: false,
});

describe("shared notifications module", () => {
  describe("createNotification", () => {
    it("gives a source notification the id {type}_{sourceId} and fills the sender, unread", async () => {
      await signInAs("user-1");

      const id = await send("user-2", {
        type: "group_invitation",
        sourceId: "group-1",
        groupId: "group-1",
        groupName: "Hikers",
      });

      expect(id).toBe("group_invitation_group-1");
      expect(await read(`users/user-2/notifications/${id}`)).toEqual({
        id,
        type: "group_invitation",
        senderUid: "user-1",
        senderUsername: "Alice",
        senderAvatarUrl: "alice.png",
        groupId: "group-1",
        groupName: "Hikers",
        createdAt: expect.any(Number),
        read: false,
      });
    });

    it("gives every outcome notification its own random id, so a repeat never overwrites the first", async () => {
      await signInAs("user-1");

      const first = await send("user-2", { type: "group_request_rejected", groupId: "group-1", groupName: "Hikers" });
      const second = await send("user-2", { type: "group_request_rejected", groupId: "group-1", groupName: "Hikers" });

      expect(first).not.toBe(second);
      expect(Object.keys(await list("users/user-2/notifications")).sort()).toEqual([first, second].sort());
    });

    it("stores an empty avatar when the sender has none, and the event / split group names (allowed by the rules)", async () => {
      await signInAs("user-1");
      const sender = { uid: "user-1", username: "Alice" };

      const eventId = await send("user-2", { type: "event_invitation", sourceId: "e-1", eventId: "e-1", eventName: "BBQ" }, sender);
      const splitId = await send(
        "user-2",
        { type: "split_settlement_pending", sourceId: "s-9", splitGroupId: "sg-1", splitGroupName: "Trip" },
        sender,
      );

      expect(await read(`users/user-2/notifications/${eventId}`)).toMatchObject({ senderAvatarUrl: "", eventName: "BBQ" });
      expect(splitId).toBe("split_settlement_pending_s-9");
      expect(await read(`users/user-2/notifications/${splitId}`)).toMatchObject({ splitGroupId: "sg-1", splitGroupName: "Trip" });
    });
  });

  it("getNotificationSender reads the sender from the profile, empty name when the profile is gone", async () => {
    await seed({ "users/user-1": { uid: "user-1", username: "Alice", usernameLower: "alice", avatarUrl: "a.png", darkMode: true, language: "en" } });
    await signInAs("user-2");

    expect(await getNotificationSender("user-1")).toMatchObject({ uid: "user-1", username: "Alice", avatarUrl: "a.png" });
    expect(await getNotificationSender("user-gone")).toEqual({ uid: "user-gone", username: "" });
  });

  it("getUnreadNotificationRefs keeps only notifications that exist and are unread", async () => {
    await seed({
      "users/user-2/notifications/friend_request_a": unread("friend_request_a"),
      "users/user-2/notifications/friend_request_b": { ...unread("friend_request_b"), read: true },
    });
    await signInAs("user-1"); // the sender resolves its own notifications (rules N4)

    const refs = await getUnreadNotificationRefs(
      ["a", "b", "missing"].map((sourceId) => sourceNotificationRef("user-2", "friend_request", sourceId)),
    );

    expect(refs.map((ref) => ref.id)).toEqual(["friend_request_a"]);
  });

  it("deleteIfUnread deletes an unread notification inside a transaction, keeps a read one, ignores a missing one", async () => {
    await seed({
      "users/user-2/notifications/friend_request_a": unread("friend_request_a"),
      "users/user-2/notifications/friend_request_b": { ...unread("friend_request_b"), read: true },
    });
    await signInAs("user-1");

    await runTransaction(fb.firestore, async (transaction) => {
      const removals = await Promise.all(
        ["a", "b", "missing"].map((sourceId) =>
          deleteIfUnread(transaction, sourceNotificationRef("user-2", "friend_request", sourceId)),
        ),
      );
      removals.forEach((remove) => remove());
    });

    expect(Object.keys(await list("users/user-2/notifications"))).toEqual(["friend_request_b"]);
  });
});
