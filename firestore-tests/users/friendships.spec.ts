import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
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

describe("users/{userId}/friendships/{friendId}", () => {
  it("accepts the acceptFriendRequest flow done by the receiver", async () => {
    await seed({
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
    const db = as(RECEIVER);

    await assertSucceeds(deleteDoc(doc(db, "friendRequests", `${SENDER}_${RECEIVER}`)));
    await assertSucceeds(setDoc(doc(db, `users/${RECEIVER}/friendships`, SENDER), friendship(db, SENDER, "Sender")));
    await assertSucceeds(setDoc(doc(db, `users/${SENDER}/friendships`, RECEIVER), friendship(db, RECEIVER, "Receiver")));
  });

  it("accepts removeFriend from either side", async () => {
    await seed({
      [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 },
      [`users/${RECEIVER}/friendships/${SENDER}`]: { username: "Sender", createdAt: 1 },
    });
    const db = as(SENDER);

    await assertSucceeds(deleteDoc(doc(db, `users/${SENDER}/friendships`, RECEIVER)));
    await assertSucceeds(deleteDoc(doc(db, `users/${RECEIVER}/friendships`, SENDER)));
  });

  it("lets only the owner read their friends list", async () => {
    await seed({ [`users/${SENDER}/friendships/${RECEIVER}`]: { username: "Receiver", createdAt: 1 } });

    await assertSucceeds(getDocs(collection(as(SENDER), `users/${SENDER}/friendships`)));
    await assertFails(getDocs(collection(as(RECEIVER), `users/${SENDER}/friendships`)));
  });

  it("blocks writing a friendship of two other users", async () => {
    const db = as(STRANGER);

    await assertFails(setDoc(doc(db, `users/${SENDER}/friendships`, RECEIVER), friendship(db, RECEIVER, "Receiver")));
  });

  it.todo("G2: blocks creating a friendship without an accepted friend request");
});
