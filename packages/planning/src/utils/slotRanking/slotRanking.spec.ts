import type { ProposedDateSlot, VoteType } from "../../api/events/types";
import { getSlotScore, isSameDaySlot, rankSlots, tallyVotes } from "./slotRanking";

const slot = (votes: Record<string, VoteType> = {}, day = "2026-07-10"): ProposedDateSlot => ({
  start: day,
  end: day,
  color: "blue",
  votes,
});

const participants = ["u1", "u2", "u3", "u4"];

describe("tallyVotes", () => {
  it("groups voters by vote", () => {
    expect(tallyVotes({ u1: "yes", u2: "maybe", u3: "no", u4: "yes" })).toEqual({
      yes: ["u1", "u4"],
      maybe: ["u2"],
      no: ["u3"],
    });
  });

  it("ignores unknown vote values", () => {
    expect(tallyVotes({ u1: "maybe", u2: "unknown" })).toEqual({ yes: [], maybe: ["u1"], no: [] });
  });

  it("returns an empty tally for missing votes", () => {
    expect(tallyVotes(undefined)).toEqual({ yes: [], maybe: [], no: [] });
  });
});

describe("getSlotScore", () => {
  it("counts yes as 1, maybe as 0.5 and no as 0", () => {
    expect(getSlotScore(tallyVotes({ u1: "yes", u2: "maybe", u3: "no" }))).toBe(1.5);
  });
});

describe("isSameDaySlot", () => {
  it("is true only when the slot starts and ends on the same date", () => {
    expect(isSameDaySlot({ start: "2026-07-10", end: "2026-07-10" })).toBe(true);
    expect(isSameDaySlot({ start: "2026-07-10", end: "2026-07-12" })).toBe(false);
  });
});

describe("rankSlots", () => {
  it("keeps slot order in `slots` and sorts `ranked` by score", () => {
    const { slots, ranked } = rankSlots({
      participants,
      proposedDates: [slot({ u1: "maybe" }), slot({ u1: "yes", u2: "yes" }), slot({ u1: "yes" })],
    });

    expect(slots.map((s) => s.slotIndex)).toEqual([0, 1, 2]);
    expect(ranked.map((s) => [s.slotIndex, s.score, s.rank])).toEqual([
      [1, 2, 1],
      [2, 1, 2],
      [0, 0.5, 3],
    ]);
  });

  it("breaks a score tie by yes count, so only the slot with more yes votes is top", () => {
    const { ranked, topSlotIndices } = rankSlots({
      participants,
      proposedDates: [slot({ u1: "maybe", u2: "maybe" }), slot({ u3: "yes" })],
    });

    expect(ranked.map((s) => [s.slotIndex, s.rank, s.isTop])).toEqual([
      [1, 1, true],
      [0, 2, false],
    ]);
    expect(topSlotIndices).toEqual(new Set([1]));
  });

  it("gives equal slots the same rank in slot order and skips the next ranks", () => {
    const { ranked, topSlotIndices } = rankSlots({
      participants,
      proposedDates: [slot({ u1: "yes" }), slot({ u2: "yes" }), slot()],
    });

    expect(ranked.map((s) => [s.slotIndex, s.rank])).toEqual([
      [0, 1],
      [1, 1],
      [2, 3],
    ]);
    expect(topSlotIndices).toEqual(new Set([0, 1]));
  });

  it("never marks a slot as top when no slot has a score", () => {
    const { slots, topSlotIndices } = rankSlots({
      participants,
      proposedDates: [slot({ u1: "no" }), slot()],
    });

    expect(slots.every((s) => s.rank === 1 && !s.isTop)).toBe(true);
    expect(topSlotIndices.size).toBe(0);
  });

  it("computes the match percentage from yes votes over participants", () => {
    const { slots } = rankSlots({
      participants: ["u1", "u2", "u3"],
      proposedDates: [slot({ u1: "yes", u2: "maybe" })],
    });

    expect(slots[0].matchPercentage).toBe(33);
  });

  it("does not divide by zero when the event has no participants", () => {
    const { slots } = rankSlots({ participants: [], proposedDates: [slot({ u1: "yes" })] });

    expect(slots[0].matchPercentage).toBe(100);
  });

  it("returns empty results for an event without slots", () => {
    expect(rankSlots({ participants, proposedDates: [] })).toEqual({
      slots: [],
      ranked: [],
      topSlotIndices: new Set(),
    });
  });
});
