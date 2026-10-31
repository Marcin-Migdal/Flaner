import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const CREATOR = "creator-uid";
const PARTICIPANT = "participant-uid";
const OUTSIDER = "outsider-uid";
const EVENT_ID = "event-1";

const { as, seed } = useTestEnv();

const schedulerEvent = (overrides: Record<string, unknown> = {}) => ({
  id: EVENT_ID,
  name: "Trip",
  description: "",
  creatorId: CREATOR,
  participants: [CREATOR, PARTICIPANT],
  proposedDates: [{ start: "2026-11-01", end: "2026-11-02", color: "#fff", votes: {} }],
  isFinalized: false,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const eventNotification = (id: string, type: string) => ({
  id,
  type,
  senderUid: CREATOR,
  senderUsername: "Creator",
  senderAvatarUrl: "",
  eventId: EVENT_ID,
  eventName: "Trip",
  createdAt: Date.now(),
  read: false,
});

/** Mirrors voteSchedulerEventSlot. */
const vote = (uid: string) => {
  const db = as(uid);
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, "events", EVENT_ID);
    const snap = await transaction.get(ref);
    const proposedDates = snap.data()?.proposedDates.map((slot: { votes: Record<string, string> }) => ({
      ...slot,
      votes: { ...slot.votes, [uid]: "yes" },
    }));
    transaction.update(ref, { proposedDates, updatedAt: Date.now() });
  });
};

describe("events/{eventId}", () => {
  it("accepts the create batch with invitations (createSchedulerEvent)", async () => {
    const db = as(CREATOR);
    const batch = writeBatch(db);
    batch.set(doc(db, "events", EVENT_ID), schedulerEvent());
    const notifRef = doc(collection(db, `users/${PARTICIPANT}/notifications`));
    batch.set(notifRef, eventNotification(notifRef.id, "event_invitation"));

    await assertSucceeds(batch.commit());
  });

  it("blocks creating an event in someone else's name", async () => {
    await assertFails(setDoc(doc(as(OUTSIDER), "events", EVENT_ID), schedulerEvent()));
  });

  it("allows the participant query and hides the event from outsiders", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });

    await assertSucceeds(
      getDocs(query(collection(as(PARTICIPANT), "events"), where("participants", "array-contains", PARTICIPANT))),
    );
    await assertFails(getDoc(doc(as(OUTSIDER), "events", EVENT_ID)));
  });

  it("lets participants vote while the event is open", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });

    await assertSucceeds(vote(PARTICIPANT));
    await assertSucceeds(vote(CREATOR));
  });

  it("blocks participant votes after finalization and outsider votes", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent({ isFinalized: true, finalizedSlotIndex: 0 }) });
    await assertFails(vote(PARTICIPANT));

    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });
    await assertFails(vote(OUTSIDER));
  });

  it("lets the creator edit, finalize and reopen the event", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });
    const db = as(CREATOR);

    await assertSucceeds(updateDoc(doc(db, "events", EVENT_ID), { name: "Trip 2", updatedAt: Date.now() }));
    await assertSucceeds(
      updateDoc(doc(db, "events", EVENT_ID), { isFinalized: true, finalizedSlotIndex: 0, updatedAt: Date.now() }),
    );

    const batch = writeBatch(db);
    batch.update(doc(db, "events", EVENT_ID), {
      isFinalized: false,
      finalizedSlotIndex: deleteField(),
      updatedAt: Date.now(),
    });
    const notifRef = doc(collection(db, `users/${PARTICIPANT}/notifications`));
    batch.set(notifRef, eventNotification(notifRef.id, "event_reopened"));
    await assertSucceeds(batch.commit());
  });

  it("lets only the creator delete the event", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });

    await assertFails(deleteDoc(doc(as(PARTICIPANT), "events", EVENT_ID)));
    await assertSucceeds(deleteDoc(doc(as(CREATOR), "events", EVENT_ID)));
  });

  it("blocks participants from changing anything but the slots", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });
    const ref = doc(as(PARTICIPANT), "events", EVENT_ID);

    await assertFails(updateDoc(ref, { creatorId: PARTICIPANT }));
    await assertFails(updateDoc(ref, { participants: [PARTICIPANT, OUTSIDER] }));
    await assertFails(updateDoc(ref, { isFinalized: true, finalizedSlotIndex: 0 }));
    await assertFails(updateDoc(ref, { name: "Renamed", updatedAt: Date.now() }));
  });

  it("blocks the creator from handing the event over and new events created as finalized", async () => {
    await seed({ [`events/${EVENT_ID}`]: schedulerEvent() });

    await assertFails(updateDoc(doc(as(CREATOR), "events", EVENT_ID), { creatorId: PARTICIPANT }));
    await assertFails(setDoc(doc(as(CREATOR), "events", "event-2"), schedulerEvent({ id: "event-2", isFinalized: true })));
  });
  it.todo("G2: blocks participants from changing other participants' votes");
});
