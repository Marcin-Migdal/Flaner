import type { FilamentSpool, SpoolInput } from "../../api/spools/types";

// The spool lifecycle: when a spool is finished, what a print takes from it, what runs over to the next spool,
// and how that next spool is prefilled. Endpoints apply these rules inside their transactions; the UI only shows the results.

const grams = (value: number) => parseFloat(value.toFixed(2));

export type FinishState = {
  currentWeight: number;
  isFinished: boolean;
  finishedAt: number | null;
};

/**
 * The one "finished" rule: a spool is finished at 0 g. `finishedAt` is stamped on the transition and kept while the
 * spool stays finished; it is cleared when the spool gets weight back (unfinish).
 */
export const finishState = (
  current: Pick<FilamentSpool, "isFinished" | "finishedAt"> | null,
  weight: number,
  now: number = Date.now(),
): FinishState => {
  const currentWeight = Math.max(0, grams(weight));
  const isFinished = currentWeight <= 0;
  const finishedAt = isFinished ? (current?.isFinished && current.finishedAt ? current.finishedAt : now) : null;
  return { currentWeight, isFinished, finishedAt };
};

export type PrintOutcome = {
  /** The spool after the print. */
  state: FinishState;
  /** What the print took from this spool; stored on the print, so undoing it restores exactly this. */
  consumed: number;
  /** What the spool did not have; it goes onto the next spool. */
  carryover: number;
};

export const applyPrint = (
  current: Pick<FilamentSpool, "currentWeight" | "isFinished" | "finishedAt">,
  usage: number,
  now: number = Date.now(),
): PrintOutcome => {
  const used = grams(usage);
  const available = Math.max(0, current.currentWeight);
  return {
    state: finishState(current, available - used, now),
    consumed: grams(Math.min(used, available)),
    carryover: grams(Math.max(0, used - available)),
  };
};

/** The form values of the spool that replaces `spool`, with the carryover already taken from it. */
export const nextSpoolPrefill = (spool: FilamentSpool, carryover: number): SpoolInput => ({
  templateId: spool.templateId ?? "",
  name: spool.name,
  initialWeight: spool.initialWeight,
  currentWeight: Math.max(0, grams(spool.initialWeight - carryover)),
});
