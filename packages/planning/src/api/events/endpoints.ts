// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/events.md (keep their Write flows / Queries in sync).
import { fb } from "@flaner/shared/firebase";
import type { UserType } from "@flaner/shared/types";
import { firestoreConverter, getUnreadNotificationRefs, sourceNotificationRef } from "@flaner/shared/utils";
import { isBefore, parseISO, startOfDay } from "date-fns";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
} from "firebase/firestore";
import type { ProposedDateSlot, SchedulerEvent, VoteType } from "./types";

const refs = {
  events: () => collection(fb.firestore, "events").withConverter(firestoreConverter<SchedulerEvent>()),
  event: (id: string) => doc(fb.firestore, "events", id).withConverter(firestoreConverter<SchedulerEvent>()),
  // Participant notifications about the event (deterministic ids, removed when the event goes away for them)
  invitationNotification: (userId: string, eventId: string) =>
    sourceNotificationRef(fb.firestore, userId, "event_invitation", eventId),
  reopenedNotification: (userId: string, eventId: string) =>
    sourceNotificationRef(fb.firestore, userId, "event_reopened", eventId),
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
    batch.set(notifRef, {
      id: notifRef.id,
      type: "event_invitation",
      senderUid: user.uid,
      senderUsername: user.username,
      senderAvatarUrl: user.avatarUrl || "",
      eventId: newEvent.id,
      eventName: newEvent.name,
      createdAt: Date.now(),
      read: false,
    });
  }

  await batch.commit();
  return newEvent;
};

export const getUserSchedulerEvents = async (userId: string): Promise<SchedulerEvent[]> => {
  const q = query(
    refs.events(),
    where("participants", "array-contains", userId),
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const subscribeToUserSchedulerEvents = (
  userId: string,
  callback: (events: SchedulerEvent[]) => void,
) => {
  if (!userId) return () => {};
  const q = query(
    refs.events(),
    where("participants", "array-contains", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => doc.data());
      callback(events);
    },
    (error) => {
      console.warn("Realtime listener on user scheduler events failed:", error);
    },
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

export const updateSchedulerEvent = async (
  eventId: string,
  data: Partial<Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt">>,
): Promise<void> => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );

  // Participants removed in this edit lose their unread event notifications
  let staleNotifications: Awaited<ReturnType<typeof getUnreadEventNotifications>> = [];
  if (data.participants) {
    const nextParticipants = data.participants;
    const previous = (await getDoc(refs.event(eventId))).data()?.participants ?? [];
    const removed = previous.filter((uid) => !nextParticipants.includes(uid));
    if (removed.length > 0) staleNotifications = await getUnreadEventNotifications(eventId, removed);
  }

  const batch = writeBatch(fb.firestore);
  batch.update(refs.event(eventId), { ...cleanData, updatedAt: Date.now() });
  staleNotifications.forEach((ref) => batch.delete(ref));
  await batch.commit();
};

export const voteSchedulerEventSlot = async (
  eventId: string,
  slotIndex: number,
  userId: string,
  vote: VoteType | null,
): Promise<void> => {
  const eventRef = refs.event(eventId);

  await runTransaction(fb.firestore, async (transaction) => {
    const sfDoc = await transaction.get(eventRef);
    if (!sfDoc.exists()) {
      throw new Error("Event does not exist");
    }

    const eventData = sfDoc.data();
    if (eventData.isFinalized) {
      throw new Error("Event is already finalized");
    }

    const proposedDates = [...eventData.proposedDates];
    if (slotIndex < 0 || slotIndex >= proposedDates.length) {
      throw new Error("Invalid slot index");
    }

    const currentSlot = proposedDates[slotIndex];
    let updatedVotes = { ...(currentSlot.votes || {}) };

    if (vote === null) {
      const { [userId]: _omitted, ...rest } = updatedVotes;
      updatedVotes = rest;
    } else {
      updatedVotes[userId] = vote;
    }

    proposedDates[slotIndex] = {
      ...currentSlot,
      votes: updatedVotes,
    };

    transaction.update(eventRef, {
      proposedDates,
      updatedAt: Date.now(),
    });
  });
};

export const batchVoteUnvotedSlots = async (
  eventId: string,
  userId: string,
  fallbackVote: VoteType = "no",
): Promise<void> => {
  const eventRef = refs.event(eventId);

  await runTransaction(fb.firestore, async (transaction) => {
    const sfDoc = await transaction.get(eventRef);
    if (!sfDoc.exists()) {
      throw new Error("Event does not exist");
    }

    const eventData = sfDoc.data();
    if (eventData.isFinalized) {
      throw new Error("Event is already finalized");
    }

    const proposedDates = (eventData.proposedDates || []).map((slot: ProposedDateSlot) => {
      const votes = { ...(slot.votes || {}) };
      if (!votes[userId]) {
        votes[userId] = fallbackVote;
      }
      return {
        ...slot,
        votes,
      };
    });

    transaction.update(eventRef, {
      proposedDates,
      updatedAt: Date.now(),
    });
  });
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

  const batch = writeBatch(fb.firestore);

  batch.update(eventRef, {
    isFinalized: false,
    finalizedSlotIndex: deleteField(),
    proposedDates: activeProposedDates.length > 0 ? activeProposedDates : event.proposedDates,
    updatedAt: Date.now(),
  });

  const otherParticipants = event.participants.filter((uid) => uid !== user.uid);
  for (const participantUid of otherParticipants) {
    const notifRef = refs.reopenedNotification(participantUid, event.id);
    batch.set(notifRef, {
      id: notifRef.id,
      type: "event_reopened",
      senderUid: user.uid,
      senderUsername: user.username,
      senderAvatarUrl: user.avatarUrl || "",
      eventId: event.id,
      eventName: event.name,
      createdAt: Date.now(),
      read: false,
    });
  }

  await batch.commit();
};
