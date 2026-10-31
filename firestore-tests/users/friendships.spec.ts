import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const SENDER = "sender-uid";
const RECEIVER = "receiver-uid";
const STRANGER = "stranger-uid";

const { as, seed } = useTestEnv();

const friendship = (db: ReturnType<typeof as>, friendUid: string, username: string) => ({
  userRef: doc(db, "users", friendUid),
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl: "",
  createdAt: Date.now(),
});

const seedRequest = () =>
  seed({
    [`friendRequests/${SENDER}_${RECEIVER}`]: {
      senderUid: SENDER,
      receiverUid: RECEIVER,
      senderUsername: "Sender",
      senderAvatarUrl: "",
      receiverUsername: "Receiver",
      receiverAvatarUrl: "",
      status: "pending",
      createdAt: 1,
    },
  });

/** Mirrors acceptFriendRequest: one batch done by `uid`. */
const acceptAs = (uid: string) => {
  const db = as(uid);
  const batch = writeBatch(db);
  batch.delete(doc(db, "friendRequests", `${SENDER}_${RECEIVER}`));
  batch.set(doc(db, `users/${RECEIVER}/friendships`, SENDER), friendship(db, SENDER, "Sender"));
  batch.set(doc(db, `users/${SENDER}/friendships`, RECEIVER), friendship(db, RECEIVER, "Receiver"));
  const notifRef = doc(collection(db, `users/${SENDER}/notifications`));
  batch.set(notifRef, {
    id: notifRef.id,
    type: "friend_request_accepted",
    senderUid: uid,
    senderUsername: "Receiver",
    senderAvatarUrl: "",
    createdAt: Date.now(),
    read: false,
  });
  return batch.commit();
};

describe("users/{userId}/friendships/{friendId}", () => {
  it("accepts the acceptFriendRequest batch done by the receiver", async () => {
    await seedRequest();

    await assertSucceeds(acceptAs(RECEIVER));
  });

  it("blocks the sender from accepting their own request", async () => {
    await seedRequest();

    await assertFails(acceptAs(SENDER));
  });

  it("blocks creating a friendship without a pending request", async () => {
    const db = as(RECEIVER);

    await assertFails(setDoc(doc(db, `users/${RECEIVER}/friendships`, SENDER), friendship(db, SENDER, "Sender")));
    await assertFails(setDoc(doc(db, `users/${SENDER}/friendships`, RECEIVER), friendship(db, RECEIVER, "Receiver")));
  });

  it("blocks friendships with extra fields", async () => {
    await seedRequest();
    const db = as(RECEIVER);

    await assertFails(
      setDoc(doc(db, `users/${RECEIVER}/friendships`, SENDER), { ...friendship(db, SENDER, "Sender"), role: "admin" }),
    );
  });

  it("accepts the removeFriend batch from either side", async () => {
    await seed({
      [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 },
      [`users/${RECEIVER}/friendships/${SENDER}`]: { username: "Sender", createdAt: 1 },
    });
    const db = as(SENDER);
    const batch = writeBatch(db);
    batch.delete(doc(db, `users/${SENDER}/friendships`, RECEIVER));
    batch.delete(doc(db, `users/${RECEIVER}/friendships`, SENDER));

    await assertSucceeds(batch.commit());
  });

  it("blocks editing friendship docs", async () => {
    await seed({ [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 } });

    await assertFails(updateDoc(doc(as(SENDER), `users/${SENDER}/friendships`, RECEIVER), { username: "Fake" }));
    await assertFails(updateDoc(doc(as(RECEIVER), `users/${SENDER}/friendships`, RECEIVER), { username: "Fake" }));
  });

  it("lets only the owner read their friends list", async () => {
    await seed({ [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 } });

    await assertSucceeds(getDocs(collection(as(SENDER), `users/${SENDER}/friendships`)));
    await assertFails(getDocs(collection(as(RECEIVER), `users/${SENDER}/friendships`)));
  });

  it("blocks touching a friendship of two other users", async () => {
    await seedRequest();
    await seed({ [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 } });
    const db = as(STRANGER);

    await assertFails(setDoc(doc(db, `users/${RECEIVER}/friendships`, SENDER), friendship(db, SENDER, "Sender")));
    await assertFails(deleteDoc(doc(db, `users/${SENDER}/friendships`, RECEIVER)));
  });
});
