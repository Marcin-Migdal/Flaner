// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/events.md (keep their Write flows / Queries in sync).
import { fb } from "@flaner/shared/firebase";
import type { UserType } from "@flaner/shared/types";
import { firestoreConverter, getUnreadNotificationRefs, sourceNotificationRef } from "@flaner/shared/utils";
import { isBefore, parseISO, startOfDay } from "date-fns";
import {
  collection,
  deleteField,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
} from "firebase/firestore";
import {
  getSlotKey,
  type ProposedDateSlot,
  type SchedulerEvent,
  type SchedulerEventEdit,
  type VoteType,
} from "./types";

const refs = {
  events: () => collection(fb.firestore, "events").withConverter(firestoreConverter<SchedulerEvent>()),
  event: (id: string) => doc(fb.firestore, "events", id).withConverter(firestoreConverter<SchedulerEvent>()),
  // Participant notifications about the event (deterministic ids, removed when the event goes away for them)
  invitationNotification: (userId: string, eventId: string) =>
    sourceNotificationRef(fb.firestore, userId, "event_invitation", eventId),
  reopenedNotification: (userId: string, eventId: string) =>
    sourceNotificationRef(fb.firestore, userId, "event_reopened", eventId),
};

// A notification to a participant from `sender` about the event
const eventNotification = (
  ref: ReturnType<typeof refs.invitationNotification>,
  type: "event_invitation" | "event_reopened",
  sender: UserType,
  event: Pick<SchedulerEvent, "id" | "name">,
) => ({
  id: ref.id,
  type,
  senderUid: sender.uid,
  senderUsername: sender.username,
  senderAvatarUrl: sender.avatarUrl || "",
  eventId: event.id,
  eventName: event.name,
  createdAt: Date.now(),
  read: false,
});

// Field-path deletes of every stored vote whose slot is not in `slots` (votes live in `votes.{uid}.{slotKey}`)
const votesOfRemovedSlots = (votes: SchedulerEvent["votes"] = {}, slots: ProposedDateSlot[]) => {
  const keys = new Set(slots.map(getSlotKey));
  return Object.fromEntries(
    Object.entries(votes).flatMap(([uid, userVotes]) =>
      Object.keys(userVotes)
        .filter((key) => !keys.has(key))
        .map((key) => [`votes.${uid}.${key}`, deleteField()]),
    ),
  );
};

// The unread event notifications of these participants (read ones stay)
const getUnreadEventNotifications = (eventId: string, participantIds: string[]) =>
  getUnreadNotificationRefs(
    participantIds.flatMap((uid) => [refs.invitationNotification(uid, eventId), refs.reopenedNotification(uid, eventId)]),
  );

export const createSchedulerEvent = async (
  data: Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt">,
  user: UserType,
): Promise<SchedulerEvent> => {
  const eventRef = doc(refs.events());

  const newEvent: SchedulerEvent = {
    ...data,
    proposedDates: withoutSlotVotes(data.proposedDates),
    id: eventRef.id,
    isFinalized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const batch = writeBatch(fb.firestore);
  batch.set(eventRef, newEvent);

  const otherParticipants = data.participants.filter((uid) => uid !== user.uid);
  for (const participantUid of otherParticipants) {
    const notifRef = refs.invitationNotification(participantUid, newEvent.id);
    batch.set(notifRef, eventNotification(notifRef, "event_invitation", user, newEvent));
  }

  await batch.commit();
  return newEvent;
};

// Puts each current participant's vote back on its slot, so screens read `slot.votes`
const withSlotVotes = (event: SchedulerEvent): SchedulerEvent => ({
  ...event,
  proposedDates: event.proposedDates.map((slot) => {
    const key = getSlotKey(slot);
    const votes = Object.fromEntries(
      event.participants.flatMap((uid) => {
        const vote = event.votes?.[uid]?.[key];
        return vote ? [[uid, vote]] : [];
      }),
    );
    return { ...slot, votes };
  }),
});

// Slots are stored without votes (they live in `votes`)
const withoutSlotVotes = (slots: ProposedDateSlot[]) => slots.map(({ start, end, color }) => ({ start, end, color }));

export const getUserSchedulerEvents = async (userId: string): Promise<SchedulerEvent[]> => {
  const q = query(
    refs.events(),
    where("participants", "array-contains", userId),
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => withSlotVotes(d.data()));
};

export const subscribeToUserSchedulerEvents = (
  userId: string,
  callback: (events: SchedulerEvent[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  if (!userId) return () => {};
  const q = query(
    refs.events(),
    where("participants", "array-contains", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((d) => withSlotVotes(d.data()));
      callback(events);
    },
    onError,
  );
};

export const deleteSchedulerEvent = async (eventId: string): Promise<void> => {
  const event = (await getDoc(refs.event(eventId))).data();
  const staleNotifications = event
    ? await getUnreadEventNotifications(eventId, event.participants.filter((uid) => uid !== event.creatorId))
    : [];

  const batch = writeBatch(fb.firestore);
  batch.delete(refs.event(eventId));
  staleNotifications.forEach((ref) => batch.delete(ref));
  await batch.commit();
};

// Fields a finalized event still takes in an edit (its slots, participants and deadline are settled)
const FINALIZED_EDITABLE_FIELDS = new Set(["name", "description"]);

/**
 * Edits the event. Votes of slots the edit removes are deleted; participants removed lose their unread event notifications.
 * A finalized event takes only `name` and `description`, so its winning slot can never disappear.
 */
export const updateSchedulerEvent = async (eventId: string, data: SchedulerEventEdit): Promise<void> => {
  const changes = Object.fromEntries(
    Object.entries({ ...data, proposedDates: data.proposedDates && withoutSlotVotes(data.proposedDates) }).filter(
      ([_, v]) => v !== undefined,
    ),
  );

  const event = (await getDoc(refs.event(eventId))).data();
  if (!event) throw new Error("Event does not exist");
  if (event.isFinalized && Object.keys(changes).some((field) => !FINALIZED_EDITABLE_FIELDS.has(field))) {
    throw new Error("A finalized event takes only a new name and description");
  }

  const nextParticipants = data.participants;
  const removedParticipants = nextParticipants ? event.participants.filter((uid) => !nextParticipants.includes(uid)) : [];
  const staleNotifications =
    removedParticipants.length > 0 ? await getUnreadEventNotifications(eventId, removedParticipants) : [];

  const batch = writeBatch(fb.firestore);
  batch.update(refs.event(eventId), {
    ...changes,
    ...(data.proposedDates && votesOfRemovedSlots(event.votes, data.proposedDates)),
    updatedAt: Date.now(),
  });
  staleNotifications.forEach((ref) => batch.delete(ref));
  await batch.commit();
};

/** Picks the winning slot by its key; voting stops */
export const finalizeSchedulerEvent = async (eventId: string, slotKey: string): Promise<void> => {
  const event = (await getDoc(refs.event(eventId))).data();
  if (!event) throw new Error("Event does not exist");
  if (event.isFinalized) throw new Error("Event is already finalized");
  if (!event.proposedDates.some((slot) => getSlotKey(slot) === slotKey)) throw new Error("Slot is not part of the event");

  await updateDoc(refs.event(eventId), { isFinalized: true, finalizedSlotKey: slotKey, updatedAt: Date.now() });
};

/** Sets (or clears, with `null`) only the voter's own entry: the rules reject any other change (#33) */
export const voteSchedulerEventSlot = (
  eventId: string,
  slotKey: string,
  userId: string,
  vote: VoteType | null,
): Promise<void> =>
  updateDoc(refs.event(eventId), new FieldPath("votes", userId, slotKey), vote ?? deleteField(), "updatedAt", Date.now());

export const batchVoteUnvotedSlots = async (
  eventId: string,
  userId: string,
  fallbackVote: VoteType = "no",
): Promise<void> => {
  const event = (await getDoc(refs.event(eventId))).data();
  if (!event) throw new Error("Event does not exist");
  if (event.isFinalized) throw new Error("Event is already finalized");

  const mine = event.votes?.[userId] ?? {};
  const unvoted = event.proposedDates.map(getSlotKey).filter((key) => !mine[key]);
  if (unvoted.length === 0) return;

  await updateDoc(
    refs.event(eventId),
    "updatedAt",
    Date.now(),
    ...unvoted.flatMap((key) => [new FieldPath("votes", userId, key), fallbackVote]),
  );
};

export const unfinalizeSchedulerEvent = async (
  event: SchedulerEvent,
  user: UserType,
): Promise<void> => {
  const eventRef = refs.event(event.id);
  const todayStart = startOfDay(new Date());

  // Filter out slots that have fully passed (end date is strictly before today)
  const activeProposedDates = event.proposedDates.filter((slot) => {
    try {
      const end = parseISO(slot.end);
      return !isBefore(end, todayStart);
    } catch {
      return true;
    }
  });

  const nextSlots = activeProposedDates.length > 0 ? activeProposedDates : event.proposedDates;

  const batch = writeBatch(fb.firestore);

  // Votes stay, except those of the past slots removed here
  batch.update(eventRef, {
    isFinalized: false,
    finalizedSlotKey: deleteField(),
    proposedDates: withoutSlotVotes(nextSlots),
    ...votesOfRemovedSlots(event.votes, nextSlots),
    updatedAt: Date.now(),
  });

  const otherParticipants = event.participants.filter((uid) => uid !== user.uid);
  for (const participantUid of otherParticipants) {
    const notifRef = refs.reopenedNotification(participantUid, event.id);
    batch.set(notifRef, eventNotification(notifRef, "event_reopened", user, event));
  }

  await batch.commit();
};
