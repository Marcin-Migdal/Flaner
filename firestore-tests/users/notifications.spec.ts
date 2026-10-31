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

  it.todo("G3: blocks notifications sent in someone else's name or with an unknown type");
});
