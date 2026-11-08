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
  finalizedSlotIndex?: number;
  createdAt: number;
  updatedAt: number;
};
