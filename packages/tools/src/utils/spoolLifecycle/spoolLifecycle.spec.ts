import { describe, it, expect } from "vitest";
import type { FilamentSpool } from "../../api/spools/types";
import { applyPrint, finishState, nextSpoolPrefill } from "./spoolLifecycle";

const NOW = 1_700_000_000_000;

const spool = (overrides: Partial<FilamentSpool> = {}): FilamentSpool => ({
  id: "spool-1",
  userId: "user-1",
  templateId: "tmpl-1",
  name: "PLA Basic Black",
  initialWeight: 1000,
  currentWeight: 500,
  isFinished: false,
  finishedAt: null,
  material: "PLA",
  type: "Basic",
  colorName: "Black",
  colorHex: "#000000",
  ...overrides,
});

describe("finishState", () => {
  it("keeps a spool with weight active", () => {
    expect(finishState(spool(), 120.456, NOW)).toEqual({ currentWeight: 120.46, isFinished: false, finishedAt: null });
  });

  it("finishes at 0 g (and below) and stamps finishedAt on the transition", () => {
    expect(finishState(spool(), -5, NOW)).toEqual({ currentWeight: 0, isFinished: true, finishedAt: NOW });
    expect(finishState(null, 0, NOW)).toEqual({ currentWeight: 0, isFinished: true, finishedAt: NOW });
  });

  it("keeps the original finishedAt while the spool stays finished", () => {
    const finished = spool({ currentWeight: 0, isFinished: true, finishedAt: 42 });
    expect(finishState(finished, 0, NOW).finishedAt).toBe(42);
  });

  it("stamps finishedAt when a finished spool has none", () => {
    expect(finishState(spool({ isFinished: true, finishedAt: null }), 0, NOW).finishedAt).toBe(NOW);
  });

  it("unfinishes and clears finishedAt when the spool gets weight back", () => {
    const finished = spool({ currentWeight: 0, isFinished: true, finishedAt: 42 });
    expect(finishState(finished, 10, NOW)).toEqual({ currentWeight: 10, isFinished: false, finishedAt: null });
  });
});

describe("applyPrint", () => {
  it("takes the whole print from a spool that has enough", () => {
    expect(applyPrint(spool({ currentWeight: 500 }), 11.5, NOW)).toEqual({
      state: { currentWeight: 488.5, isFinished: false, finishedAt: null },
      consumed: 11.5,
      carryover: 0,
    });
  });

  it("finishes the spool exactly at 0 g without carryover", () => {
    expect(applyPrint(spool({ currentWeight: 20 }), 20, NOW)).toEqual({
      state: { currentWeight: 0, isFinished: true, finishedAt: NOW },
      consumed: 20,
      carryover: 0,
    });
  });

  it("takes only what the spool has and carries the rest over", () => {
    expect(applyPrint(spool({ currentWeight: 5 }), 20, NOW)).toEqual({
      state: { currentWeight: 0, isFinished: true, finishedAt: NOW },
      consumed: 5,
      carryover: 15,
    });
  });

  it("rounds to 0.01 g", () => {
    const outcome = applyPrint(spool({ currentWeight: 0.3 }), 0.1 + 0.2 + 0.25, NOW);
    expect(outcome.consumed).toBe(0.3);
    expect(outcome.carryover).toBe(0.25);
  });
});

describe("nextSpoolPrefill", () => {
  it("copies the spool and takes the carryover from its full weight", () => {
    expect(nextSpoolPrefill(spool(), 15)).toEqual({
      templateId: "tmpl-1",
      name: "PLA Basic Black",
      initialWeight: 1000,
      currentWeight: 985,
    });
  });

  it("starts full without carryover and never below 0 g", () => {
    expect(nextSpoolPrefill(spool(), 0).currentWeight).toBe(1000);
    expect(nextSpoolPrefill(spool({ initialWeight: 10 }), 25).currentWeight).toBe(0);
  });

  it("leaves the template empty when the template was deleted", () => {
    expect(nextSpoolPrefill(spool({ templateId: null }), 0).templateId).toBe("");
  });
});
