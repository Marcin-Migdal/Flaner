import type { SlotColorKey } from "../../utils/slotColors";

export type VoteType = "yes" | "maybe" | "no";

/** uid → slot key → vote, stored on the event; each participant writes only their own entry (#33) */
export type EventVotes = Record<string, Record<string, VoteType>>;

export type ProposedDateSlot = {
  start: string;
  end: string;
  /** Palette key; the light/dark colour lives in theme.css (`--event-<key>`) */
  color: SlotColorKey;
  /** uid → vote; derived from `SchedulerEvent.votes` when the event is read, never stored in the slot */
  votes?: Record<string, VoteType>;
};

/** A slot is identified by its dates (the edit modal also matches slots by dates) */
export const getSlotKey = ({ start, end }: Pick<ProposedDateSlot, "start" | "end">) => `${start}_${end}`;

export type SchedulerEvent = {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  participants: string[];
  endDate?: string;
  proposedDates: ProposedDateSlot[];
  votes?: EventVotes;
  isFinalized?: boolean;
  /** Slot key (`getSlotKey`) of the winning slot, set by `finalizeSchedulerEvent`; slots of a finalized event cannot change */
  finalizedSlotKey?: string;
  createdAt: number;
  updatedAt: number;
};

/** The winning slot of a finalized event */
export const getWinningSlot = ({ isFinalized, finalizedSlotKey, proposedDates }: SchedulerEvent) =>
  isFinalized ? proposedDates.find((slot) => getSlotKey(slot) === finalizedSlotKey) : undefined;

/** What the creator may change in an edit; a finalized event takes only `name` and `description` */
export type SchedulerEventEdit = Partial<Pick<SchedulerEvent, "name" | "description" | "endDate" | "participants" | "proposedDates">>;
