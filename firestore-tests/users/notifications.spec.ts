import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const RECIPIENT = "recipient-uid";
const SENDER = "sender-uid";

const { as, anonymous, seed } = useTestEnv();

const notification = (id: string, read = false) => ({
  id,
  type: "friend_request",
  senderUid: SENDER,
  senderUsername: "Sender",
  senderAvatarUrl: "",
  createdAt: Date.now(),
  read,
});

const inbox = `users/${RECIPIENT}/notifications`;

describe("users/{userId}/notifications/{notifId}", () => {
  it("lets a signed-in user notify another user (friend request, invitations, splits)", async () => {
    const db = as(SENDER);
    const ref = doc(collection(db, inbox));

    await assertSucceeds(setDoc(ref, notification(ref.id)));
  });

  it("blocks unauthenticated notifications", async () => {
    await assertFails(setDoc(doc(anonymous(), inbox, "n1"), notification("n1")));
  });

  it("allows the inbox queries for the recipient (subscribeToNotifications, getReadNotificationsPage)", async () => {
    const db = as(RECIPIENT);

    await assertSucceeds(getDocs(query(collection(db, inbox), where("read", "==", false), orderBy("createdAt", "desc"))));
    await assertSucceeds(
      getDocs(query(collection(db, inbox), where("read", "==", true), orderBy("createdAt", "desc"), limit(15))),
    );
  });

  it("lets the recipient mark one or all notifications as read", async () => {
    await seed({ [`${inbox}/n1`]: notification("n1"), [`${inbox}/n2`]: notification("n2") });
    const db = as(RECIPIENT);

    await assertSucceeds(updateDoc(doc(db, inbox, "n1"), { read: true }));

    const batch = writeBatch(db);
    batch.update(doc(db, inbox, "n2"), { read: true });
    await assertSucceeds(batch.commit());
  });

  it("blocks other users from reading or changing the inbox", async () => {
    await seed({ [`${inbox}/n1`]: notification("n1") });
    const db = as(SENDER);

    await assertFails(getDocs(collection(db, inbox)));
    await assertFails(updateDoc(doc(db, inbox, "n1"), { read: true }));
  });

  it("accepts every notification shape the app writes", async () => {
    const db = as(SENDER);
    const shapes = [
      { type: "friend_request_accepted" },
      { type: "group_invitation", groupId: "g1", groupName: "Hikers" },
      ...[
        "group_invitation_accepted",
        "group_invitation_rejected",
        "group_request_accepted",
        "group_request_rejected",
        "group_ownership_transferred",
        "group_deleted",
      ].map((type) => ({ type, groupId: "g1", groupName: "Hikers" })),
      { type: "event_invitation", eventId: "e1", eventName: "Trip" },
      { type: "split_settlement_pending", splitGroupId: "s1", splitGroupName: "Trip" },
    ];

    for (const shape of shapes) {
      const ref = doc(collection(db, inbox));
      await assertSucceeds(setDoc(ref, { ...notification(ref.id), ...shape }));
    }
  });

  it("blocks notifications in someone else's name, unknown types, system alerts and extra fields", async () => {
    const db = as(SENDER);
    const ref = () => doc(collection(db, inbox));

    const fake = ref();
    await assertFails(setDoc(fake, { ...notification(fake.id), senderUid: "admin-uid" }));
    const unknown = ref();
    await assertFails(setDoc(unknown, { ...notification(unknown.id), type: "payment_request" }));
    const alert = ref();
    await assertFails(setDoc(alert, { ...notification(alert.id), type: "system_alert" }));
    const extra = ref();
    await assertFails(setDoc(extra, { ...notification(extra.id), link: "https://evil.example" }));
    const alreadyRead = ref();
    await assertFails(setDoc(alreadyRead, notification(alreadyRead.id, true)));
    await assertFails(setDoc(ref(), notification("other-id")));
  });

  it("lets the recipient change only the read flag", async () => {
    await seed({ [`${inbox}/n1`]: notification("n1") });

    await assertFails(updateDoc(doc(as(RECIPIENT), inbox, "n1"), { senderUsername: "Someone else" }));
  });
});

describe("stale notification cleanup (N4, N5)", () => {
  const STAFF = "staff-uid";
  const MEMBER = "member-uid";
  const STRANGER = "stranger-uid";
  const GROUP_ID = "g1";
  const SPLIT_ID = "s1";
  const stale = (id: string, extra: Record<string, unknown> = {}, read = false) => ({ ...notification(id, read), ...extra });
  const seedGroup = () =>
    seed({
      [`groups/${GROUP_ID}`]: { id: GROUP_ID, name: "G", ownerId: STAFF, type: "private", requiresApproval: false },
      [`groups/${GROUP_ID}/members/${STAFF}`]: { userId: STAFF, role: "admin", joinedAt: 1 },
      [`groups/${GROUP_ID}/members/${MEMBER}`]: { userId: MEMBER, role: "member", joinedAt: 1 },
      [`split_groups/${SPLIT_ID}`]: { id: SPLIT_ID, name: "S", createdBy: STAFF, participants: [STAFF, MEMBER] },
    });

  it("lets the sender get and delete their own unread notification, not a read one", async () => {
    await seed({ [`${inbox}/n1`]: stale("n1"), [`${inbox}/n2`]: stale("n2", {}, true) });
    const db = as(SENDER);

    await assertSucceeds(getDoc(doc(db, inbox, "n1")));
    await assertSucceeds(deleteDoc(doc(db, inbox, "n1")));
    await assertFails(deleteDoc(doc(db, inbox, "n2")));
  });

  it("lets group staff and the split group owner delete unread notifications of their group only", async () => {
    await seedGroup();
    await seed({
      [`${inbox}/group_invitation_g1`]: stale("group_invitation_g1", { type: "group_invitation", groupId: GROUP_ID, groupName: "G" }),
      [`${inbox}/split_group_invitation_s1`]: stale("split_group_invitation_s1", { type: "split_group_invitation", splitGroupId: SPLIT_ID, splitGroupName: "S" }),
      [`${inbox}/group_invitation_other`]: stale("group_invitation_other", { type: "group_invitation", groupId: "other-group", groupName: "X" }),
    });

    await assertFails(deleteDoc(doc(as(MEMBER), inbox, "group_invitation_g1")));
    await assertFails(deleteDoc(doc(as(MEMBER), inbox, "split_group_invitation_s1")));
    await assertFails(deleteDoc(doc(as(STAFF), inbox, "group_invitation_other")));

    await assertSucceeds(getDoc(doc(as(STAFF), inbox, "group_invitation_g1")));
    await assertSucceeds(deleteDoc(doc(as(STAFF), inbox, "group_invitation_g1")));
    await assertSucceeds(deleteDoc(doc(as(STAFF), inbox, "split_group_invitation_s1")));
  });

  it("keeps read notifications even for group staff", async () => {
    await seedGroup();
    await seed({
      [`${inbox}/group_invitation_g1`]: stale("group_invitation_g1", { type: "group_invitation", groupId: GROUP_ID, groupName: "G" }, true),
    });

    await assertFails(deleteDoc(doc(as(STAFF), inbox, "group_invitation_g1")));
  });

  it("blocks strangers on existing notifications but lets anyone get / delete a missing one", async () => {
    await seed({ [`${inbox}/n1`]: stale("n1") });
    const db = as(STRANGER);

    await assertFails(getDoc(doc(db, inbox, "n1")));
    await assertFails(deleteDoc(doc(db, inbox, "n1")));
    await assertSucceeds(getDoc(doc(db, inbox, "missing")));
    await assertSucceeds(deleteDoc(doc(db, inbox, "missing")));
  });

  it("lets the sender overwrite their own notification (same id) as a new unread one; others cannot", async () => {
    await seed({ [`${inbox}/event_reopened_e1`]: stale("event_reopened_e1", { type: "event_reopened", eventId: "e1", eventName: "Trip" }, true) });
    const fresh = stale("event_reopened_e1", { type: "event_reopened", eventId: "e1", eventName: "Trip" });

    await assertSucceeds(setDoc(doc(as(SENDER), inbox, "event_reopened_e1"), fresh));
    // Now unread and from SENDER: someone else cannot replace it
    await assertFails(setDoc(doc(as(STRANGER), inbox, "event_reopened_e1"), { ...fresh, senderUid: STRANGER }));
  });

  it("lets anyone replace a read notification with a valid one in their own name (re-invite)", async () => {
    const id = "split_group_invitation_s1";
    await seed({ [`${inbox}/${id}`]: stale(id, { type: "split_group_invitation", splitGroupId: "s1", splitGroupName: "S" }, true) });

    await assertSucceeds(
      setDoc(doc(as(STRANGER), inbox, id), {
        ...stale(id, { type: "split_group_invitation", splitGroupId: "s1", splitGroupName: "S" }),
        senderUid: STRANGER,
      }),
    );
  });
});
