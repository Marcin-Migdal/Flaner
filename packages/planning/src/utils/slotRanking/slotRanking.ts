import type { ProposedDateSlot, SchedulerEvent, VoteType } from "../../api/events/types";

/** uids of the participants who gave each vote on one slot */
export type SlotTally = Record<VoteType, string[]>;

export type RankedSlot = {
  slot: ProposedDateSlot;
  /** Position of the slot in `event.proposedDates` */
  slotIndex: number;
  tally: SlotTally;
  score: number;
  /** Share of participants who voted yes, 0–100 */
  matchPercentage: number;
  /** 1 = best; slots with the same score and yes count share a rank */
  rank: number;
  /** Rank 1 with a score above 0 */
  isTop: boolean;
};

export type SlotRanking = {
  /** In slot order (`event.proposedDates`) */
  slots: RankedSlot[];
  /** Best first: score, then yes count, then slot order */
  ranked: RankedSlot[];
  topSlotIndices: Set<number>;
};

const isVoteType = (value: string | undefined): value is VoteType =>
  value === "yes" || value === "maybe" || value === "no";

/** Values other than yes / maybe / no are ignored (the security rules do not check vote values) */
export const tallyVotes = (votes: Partial<Record<string, string>> = {}): SlotTally => {
  const tally: SlotTally = { yes: [], maybe: [], no: [] };
  Object.entries(votes).forEach(([uid, vote]) => {
    if (isVoteType(vote)) tally[vote].push(uid);
  });
  return tally;
};

/** yes counts 1, maybe counts 0.5, no counts 0 */
export const getSlotScore = ({ yes, maybe }: SlotTally) => yes.length + maybe.length * 0.5;

export const isSameDaySlot = ({ start, end }: Pick<ProposedDateSlot, "start" | "end">) => start === end;

const compareSlots = (a: RankedSlot, b: RankedSlot) =>
  b.score - a.score || b.tally.yes.length - a.tally.yes.length;

export const rankSlots = ({
  proposedDates,
  participants,
}: Pick<SchedulerEvent, "proposedDates" | "participants">): SlotRanking => {
  const participantsCount = Math.max(1, participants.length);

  const slots: RankedSlot[] = proposedDates.map((slot, slotIndex) => {
    const tally = tallyVotes(slot.votes);
    return {
      slot,
      slotIndex,
      tally,
      score: getSlotScore(tally),
      matchPercentage: Math.round((tally.yes.length / participantsCount) * 100),
      rank: 0,
      isTop: false,
    };
  });

  // Array.prototype.sort is stable, so equal slots keep slot order
  const ranked = [...slots].sort(compareSlots);
  ranked.forEach((item, i) => {
    const prev = ranked[i - 1];
    item.rank = prev && compareSlots(prev, item) === 0 ? prev.rank : i + 1;
    item.isTop = item.rank === 1 && item.score > 0;
  });

  return {
    slots,
    ranked,
    topSlotIndices: new Set(ranked.filter((item) => item.isTop).map((item) => item.slotIndex)),
  };
};
