import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
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
      { type: "group_invitation" },
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
