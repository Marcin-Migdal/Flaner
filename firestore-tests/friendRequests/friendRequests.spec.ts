import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const SENDER = "sender-uid";
const RECEIVER = "receiver-uid";
const STRANGER = "stranger-uid";
const REQUEST_ID = `${SENDER}_${RECEIVER}`;

const { as, seed } = useTestEnv();

const friendRequest = () => ({
  senderUid: SENDER,
  receiverUid: RECEIVER,
  senderUsername: "Sender",
  senderAvatarUrl: "",
  receiverUsername: "Receiver",
  receiverAvatarUrl: "",
  status: "pending",
  createdAt: Date.now(),
});

describe("friendRequests/{senderUid}_{receiverUid}", () => {
  it("lets the sender send a request (sendFriendRequest)", async () => {
    await assertSucceeds(setDoc(doc(as(SENDER), "friendRequests", REQUEST_ID), friendRequest()));
  });

  it("allows the sent / received list queries", async () => {
    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });

    await assertSucceeds(
      getDocs(
        query(
          collection(as(SENDER), "friendRequests"),
          where("senderUid", "==", SENDER),
          where("status", "==", "pending"),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(as(RECEIVER), "friendRequests"),
          where("receiverUid", "==", RECEIVER),
          where("status", "==", "pending"),
        ),
      ),
    );
  });

  it("lets the sender cancel and the receiver accept / reject (delete)", async () => {
    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });
    await assertSucceeds(deleteDoc(doc(as(SENDER), "friendRequests", REQUEST_ID)));

    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });
    await assertSucceeds(deleteDoc(doc(as(RECEIVER), "friendRequests", REQUEST_ID)));
  });

  it("hides the request from third users", async () => {
    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });
    const db = as(STRANGER);

    await assertFails(getDoc(doc(db, "friendRequests", REQUEST_ID)));
    await assertFails(deleteDoc(doc(db, "friendRequests", REQUEST_ID)));
  });

  it("blocks sending a request between two other users", async () => {
    await assertFails(setDoc(doc(as(STRANGER), "friendRequests", REQUEST_ID), friendRequest()));
  });

  it("blocks the receiver from creating a request in the sender's name", async () => {
    await assertFails(setDoc(doc(as(RECEIVER), "friendRequests", REQUEST_ID), friendRequest()));
  });

  it("blocks a request id that does not match sender_receiver, self-requests and non-pending status", async () => {
    const db = as(SENDER);

    await assertFails(setDoc(doc(db, "friendRequests", `${RECEIVER}_${SENDER}`), friendRequest()));
    await assertFails(
      setDoc(doc(db, "friendRequests", `${SENDER}_${SENDER}`), { ...friendRequest(), receiverUid: SENDER }),
    );
    await assertFails(setDoc(doc(db, "friendRequests", REQUEST_ID), { ...friendRequest(), status: "accepted" }));
  });

  it("blocks third users from overwriting a request by naming themselves the sender", async () => {
    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });

    await assertFails(
      setDoc(doc(as(STRANGER), "friendRequests", REQUEST_ID), { ...friendRequest(), senderUid: STRANGER }),
    );
  });

  it("blocks editing or re-sending a request after it was sent", async () => {
    await seed({ [`friendRequests/${REQUEST_ID}`]: friendRequest() });

    await assertFails(updateDoc(doc(as(RECEIVER), "friendRequests", REQUEST_ID), { status: "accepted" }));
    await assertFails(setDoc(doc(as(SENDER), "friendRequests", REQUEST_ID), friendRequest()));
  });
});
