// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { FirestoreError } from "firebase/firestore";
import type { UserType } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import { getSlotKey, type ProposedDateSlot, type SchedulerEvent } from "./types";
import {
  batchVoteUnvotedSlots,
  createSchedulerEvent,
  deleteSchedulerEvent,
  finalizeSchedulerEvent,
  getUserSchedulerEvents,
  subscribeToUserSchedulerEvents,
  unfinalizeSchedulerEvent,
  updateSchedulerEvent,
  voteSchedulerEventSlot,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const EVENT = "events/event-1";
const DENIED = { code: "permission-denied" };

const alice: UserType = {
  uid: "user-1",
  username: "Alice",
  usernameLower: "alice",
  email: "alice@flaner.app",
  avatarUrl: "alice.png",
  language: "en",
  darkMode: false,
};

const pastSlot: ProposedDateSlot = { start: "2020-01-01", end: "2020-01-02", color: "blue" };
const slotA: ProposedDateSlot = { start: "2099-06-01", end: "2099-06-01", color: "teal" };
const slotB: ProposedDateSlot = { start: "2099-06-10", end: "2099-06-12", color: "pink" };
const slotC: ProposedDateSlot = { start: "2099-07-01", end: "2099-07-01", color: "blue" };
const [PAST, A, B, C] = [pastSlot, slotA, slotB, slotC].map(getSlotKey);

const schedulerEvent = (overrides: Partial<SchedulerEvent> = {}): SchedulerEvent => ({
  id: "event-1",
  name: "Board games",
  description: "Play night",
  creatorId: "user-1",
  participants: ["user-1", "user-2"],
  proposedDates: [slotA, slotB, slotC],
  isFinalized: false,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const notification = (type: string, uid: string, read: boolean) => ({
  [`users/${uid}/notifications/${type}_event-1`]: {
    id: `${type}_event-1`,
    type,
    senderUid: "user-1",
    senderUsername: "Alice",
    senderAvatarUrl: "",
    eventId: "event-1",
    eventName: "Board games",
    createdAt: 1,
    read,
  },
});

describe("events endpoints (emulator)", () => {
  describe("createSchedulerEvent", () => {
    it("stores an open event without slot votes and invites the other participants only", async () => {
      await signInAs("user-1");

      const created = await createSchedulerEvent(
        {
          name: "Board games",
          description: "Play night",
          creatorId: "user-1",
          participants: ["user-1", "user-2"],
          proposedDates: [{ ...slotA, votes: { "user-1": "yes" } }],
          votes: { "user-1": { [A]: "yes" } },
        },
        { ...alice, avatarUrl: "" },
      );

      expect(await read(`events/${created.id}`)).toMatchObject({
        isFinalized: false,
        proposedDates: [slotA],
        votes: { "user-1": { [A]: "yes" } },
      });
      expect(Object.values(await list("users/user-2/notifications"))).toEqual([
        expect.objectContaining({ type: "event_invitation", eventId: created.id, senderAvatarUrl: "" }),
      ]);
      expect(await list("users/user-1/notifications")).toEqual({});
    });
  });

  describe("getUserSchedulerEvents & subscribeToUserSchedulerEvents", () => {
    beforeEach(async () => {
      await seed({
        // user-3 left the event: their vote stays stored but is not shown
        [EVENT]: schedulerEvent({ votes: { "user-2": { [A]: "maybe" }, "user-3": { [A]: "yes" } } }),
        "events/event-2": schedulerEvent({ id: "event-2", creatorId: "user-3", participants: ["user-3"] }),
      });
      await signInAs("user-2");
    });

    it("returns the user's events with the current participants' votes on each slot", async () => {
      const events = await getUserSchedulerEvents("user-2");

      expect(events.map((e) => e.id)).toEqual(["event-1"]);
      expect(events[0].proposedDates.map((slot) => slot.votes)).toEqual([{ "user-2": "maybe" }, {}, {}]);
    });

    it("subscribeToUserSchedulerEvents returns a no-op without a user", () => {
      const callback = vi.fn();
      subscribeToUserSchedulerEvents("", callback, vi.fn())();
      expect(callback).not.toHaveBeenCalled();
    });

    it("subscribeToUserSchedulerEvents delivers the user's events", async () => {
      const events = await new Promise<SchedulerEvent[]>((resolve, reject) => {
        const unsubscribe = subscribeToUserSchedulerEvents(
          "user-2",
          (next) => {
            unsubscribe();
            resolve(next);
          },
          reject,
        );
      });
      expect(events.map((e) => e.id)).toEqual(["event-1"]);
    });

    it("subscribeToUserSchedulerEvents reports a listener rejected by the rules", async () => {
      const error = await new Promise<FirestoreError>((resolve) => {
        subscribeToUserSchedulerEvents("user-3", vi.fn(), resolve);
      });
      expect(error.code).toBe("permission-denied");
    });
  });

  describe("updateSchedulerEvent", () => {
    it("deletes only the votes of the slots the edit removes", async () => {
      await seed({
        [EVENT]: schedulerEvent({ votes: { "user-1": { [A]: "yes", [B]: "no" }, "user-2": { [B]: "yes", [C]: "maybe" } } }),
      });
      await signInAs("user-1");

      // B removed, C kept, a new slot added
      const newSlot: ProposedDateSlot = { start: "2099-08-01", end: "2099-08-01", color: "blue" };
      await updateSchedulerEvent("event-1", { name: "Renamed", proposedDates: [slotA, slotC, newSlot] });

      expect(await read(EVENT)).toMatchObject({
        name: "Renamed",
        proposedDates: [slotA, slotC, newSlot],
        votes: { "user-1": { [A]: "yes" }, "user-2": { [C]: "maybe" } },
      });
    });

    it("keeps every vote when the edit does not touch the slots", async () => {
      const votes = { "user-2": { [A]: "yes" as const, [B]: "no" as const } };
      await seed({ [EVENT]: schedulerEvent({ votes }) });
      await signInAs("user-1");

      await updateSchedulerEvent("event-1", { description: "New", participants: ["user-1", "user-2", "user-3"] });

      expect(await read(EVENT)).toMatchObject({ description: "New", participants: ["user-1", "user-2", "user-3"], votes });
    });

    it("removes the unread event notifications of participants removed in the edit, read ones stay", async () => {
      await seed({
        [EVENT]: schedulerEvent({ participants: ["user-1", "user-2", "user-3"] }),
        ...notification("event_invitation", "user-2", false),
        ...notification("event_reopened", "user-2", true),
        ...notification("event_invitation", "user-3", false),
      });
      await signInAs("user-1");

      await updateSchedulerEvent("event-1", { participants: ["user-1", "user-3"] });

      expect(Object.keys(await list("users/user-2/notifications"))).toEqual(["event_reopened_event-1"]);
      expect(Object.keys(await list("users/user-3/notifications"))).toEqual(["event_invitation_event-1"]);
    });

    it("lets a finalized event only be renamed, so its winning slot cannot be removed", async () => {
      await seed({ [EVENT]: schedulerEvent({ isFinalized: true, finalizedSlotKey: B }) });
      await signInAs("user-1");

      await expect(updateSchedulerEvent("event-1", { proposedDates: [slotA, slotC] })).rejects.toThrow(
        "A finalized event takes only a new name and description",
      );
      await expect(updateSchedulerEvent("event-1", { participants: ["user-1"] })).rejects.toThrow();
      await updateSchedulerEvent("event-1", { name: "Renamed", description: "New" });

      expect(await read(EVENT)).toMatchObject({
        name: "Renamed",
        description: "New",
        proposedDates: [slotA, slotB, slotC],
        participants: ["user-1", "user-2"],
        finalizedSlotKey: B,
      });
    });

    it("rejects a participant's edit and a missing event", async () => {
      await seed({ [EVENT]: schedulerEvent() });
      await signInAs("user-2");

      await expect(updateSchedulerEvent("event-1", { name: "Mine" })).rejects.toMatchObject(DENIED);
      await expect(updateSchedulerEvent("missing", { name: "Mine" })).rejects.toMatchObject(DENIED);
    });
  });

  describe("finalizeSchedulerEvent", () => {
    it("stores the winning slot by its key, so it survives the slot order", async () => {
      await seed({ [EVENT]: schedulerEvent() });
      await signInAs("user-1");

      await finalizeSchedulerEvent("event-1", B);

      expect(await read(EVENT)).toMatchObject({ isFinalized: true, finalizedSlotKey: B });
    });

    it("rejects a slot that is not part of the event, an already finalized event and a participant", async () => {
      await seed({ [EVENT]: schedulerEvent() });
      await signInAs("user-2");
      await expect(finalizeSchedulerEvent("event-1", A)).rejects.toMatchObject(DENIED);

      await signInAs("user-1");
      await expect(finalizeSchedulerEvent("event-1", PAST)).rejects.toThrow("Slot is not part of the event");

      await finalizeSchedulerEvent("event-1", A);
      await expect(finalizeSchedulerEvent("event-1", B)).rejects.toThrow("Event is already finalized");
      expect(await read(EVENT)).toMatchObject({ finalizedSlotKey: A });
    });
  });

  describe("unfinalizeSchedulerEvent", () => {
    it("reopens voting: drops past slots and only their votes, notifies the other participants", async () => {
      const event = schedulerEvent({
        proposedDates: [pastSlot, slotA],
        votes: { "user-1": { [PAST]: "yes", [A]: "yes" }, "user-2": { [PAST]: "no", [A]: "maybe" } },
        isFinalized: true,
        finalizedSlotKey: A,
      });
      await seed({ [EVENT]: event, ...notification("event_reopened", "user-2", true) });
      await signInAs("user-1");

      await unfinalizeSchedulerEvent(event, { ...alice, avatarUrl: "" });

      const stored = await read(EVENT);
      expect(stored).toMatchObject({
        isFinalized: false,
        proposedDates: [slotA],
        votes: { "user-1": { [A]: "yes" }, "user-2": { [A]: "maybe" } },
      });
      expect(stored).not.toHaveProperty("finalizedSlotKey");
      expect(await read("users/user-2/notifications/event_reopened_event-1")).toMatchObject({
        type: "event_reopened",
        read: false,
        senderAvatarUrl: "",
      });
      expect(await list("users/user-1/notifications")).toEqual({});
    });

    it("keeps every slot and vote when all slots have passed", async () => {
      const votes = { "user-2": { [PAST]: "yes" as const } };
      const event = schedulerEvent({ proposedDates: [pastSlot], votes, isFinalized: true, finalizedSlotKey: PAST });
      await seed({ [EVENT]: event });
      await signInAs("user-1");

      await unfinalizeSchedulerEvent(event, alice);

      expect(await read(EVENT)).toMatchObject({ isFinalized: false, proposedDates: [pastSlot], votes });
    });
  });

  describe("voting", () => {
    it("voteSchedulerEventSlot sets and clears only the voter's own entry", async () => {
      await seed({ [EVENT]: schedulerEvent({ votes: { "user-1": { [A]: "yes" } } }) });
      await signInAs("user-2");

      await voteSchedulerEventSlot("event-1", A, "user-2", "maybe");
      expect(await read(EVENT)).toMatchObject({ votes: { "user-1": { [A]: "yes" }, "user-2": { [A]: "maybe" } } });

      await voteSchedulerEventSlot("event-1", A, "user-2", null);
      expect(await read(EVENT)).toMatchObject({ votes: { "user-1": { [A]: "yes" }, "user-2": {} } });
    });

    it("voteSchedulerEventSlot is rejected once the event is finalized", async () => {
      await seed({ [EVENT]: schedulerEvent({ isFinalized: true, finalizedSlotKey: A }) });
      await signInAs("user-2");

      await expect(voteSchedulerEventSlot("event-1", A, "user-2", "yes")).rejects.toMatchObject(DENIED);
    });

    it("batchVoteUnvotedSlots fills only the voter's unvoted slots", async () => {
      await seed({ [EVENT]: schedulerEvent({ votes: { "user-2": { [A]: "yes" } } }) });
      await signInAs("user-2");

      await batchVoteUnvotedSlots("event-1", "user-2");
      // Nothing left to fill: no write
      await batchVoteUnvotedSlots("event-1", "user-2", "maybe");

      expect(await read(EVENT)).toMatchObject({ votes: { "user-2": { [A]: "yes", [B]: "no", [C]: "no" } } });
    });

    it("batchVoteUnvotedSlots rejects a finalized event", async () => {
      await seed({ [EVENT]: schedulerEvent({ isFinalized: true, finalizedSlotKey: A }) });
      await signInAs("user-2");

      await expect(batchVoteUnvotedSlots("event-1", "user-2")).rejects.toThrow("Event is already finalized");
    });
  });

  describe("deleteSchedulerEvent", () => {
    it("deletes the event and the other participants' unread event notifications, read ones stay", async () => {
      await seed({
        [EVENT]: schedulerEvent(),
        ...notification("event_invitation", "user-2", false),
        ...notification("event_reopened", "user-2", true),
      });
      await signInAs("user-1");

      await deleteSchedulerEvent("event-1");

      expect(await read(EVENT)).toBeUndefined();
      expect(Object.keys(await list("users/user-2/notifications"))).toEqual(["event_reopened_event-1"]);
    });

    it("rejects a participant", async () => {
      await seed({ [EVENT]: schedulerEvent() });
      await signInAs("user-2");

      await expect(deleteSchedulerEvent("event-1")).rejects.toMatchObject(DENIED);
      expect(await read(EVENT)).toBeDefined();
    });
  });
});
