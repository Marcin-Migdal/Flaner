// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator, trackBatchWrites } from "@flaner/test-utils/emulator";
import type { FilamentTemplate } from "../templates/types";
import type { FilamentSpool, SpoolPrint } from "./types";
import {
  addSpool,
  deleteSpool,
  editSpool,
  fetchLastPrint,
  fetchSpoolPrints,
  fetchSpools,
  markSpoolAsFinished,
  recordSpoolUsage,
  undoLastPrint,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const spool = (overrides: Partial<FilamentSpool> = {}): FilamentSpool => ({
  id: "spool-1",
  userId: "user-1",
  templateId: "tpl-1",
  name: "PLA Basic Black",
  initialWeight: 1000,
  currentWeight: 500,
  isFinished: false,
  finishedAt: null,
  createdAt: 1,
  material: "PLA",
  type: "Basic",
  colorName: "Black",
  colorHex: "#000000",
  ...overrides,
});

const print = (id: string, usedWeight: number, createdAt: number): SpoolPrint => ({ id, usedWeight, createdAt });

const template: FilamentTemplate = {
  id: "tpl-2",
  userId: "user-1",
  material: "PETG",
  type: "HF",
  colorName: "Clear",
  colorHex: "#eeeeee",
  defaultWeight: 1000,
};

const input = { templateId: "tpl-2", name: "PETG HF Clear", initialWeight: 1000 };

describe("tools spools endpoints", () => {
  describe("fetchSpools", () => {
    it("returns the user's spools, newest first", async () => {
      await seed({
        "spools/a": spool({ id: "a", createdAt: 1 }),
        "spools/b": spool({ id: "b", createdAt: 3 }),
        "spools/c": spool({ id: "c", createdAt: 2 }),
        "spools/other": spool({ id: "other", userId: "user-2" }),
      });
      await signInAs("user-1");

      expect((await fetchSpools("user-1")).map((s) => s.id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("addSpool", () => {
    it("stores an active spool with the template's details", async () => {
      await signInAs("user-1");

      const id = await addSpool("user-1", { ...input, currentWeight: 800 }, template);

      expect(await read(`spools/${id}`)).toMatchObject({
        id,
        userId: "user-1",
        templateId: "tpl-2",
        currentWeight: 800,
        isFinished: false,
        finishedAt: null,
        material: "PETG",
        type: "HF",
        colorName: "Clear",
        colorHex: "#eeeeee",
      });
    });

    it("stores a spool added at 0 g as finished, with fallback details without a template", async () => {
      await signInAs("user-1");

      const id = await addSpool("user-1", { ...input, currentWeight: 0 });

      expect(await read(`spools/${id}`)).toMatchObject({
        isFinished: true,
        finishedAt: expect.any(Number),
        material: "Unknown",
        type: "Custom",
        colorName: "Default",
        colorHex: "#808080",
      });
    });
  });

  describe("editSpool", () => {
    it("updates the spool and its template details", async () => {
      await seed({ "spools/spool-1": spool() });
      await signInAs("user-1");

      await editSpool("spool-1", { ...input, currentWeight: 300 }, template);

      expect(await read("spools/spool-1")).toMatchObject({ name: "PETG HF Clear", currentWeight: 300, isFinished: false, material: "PETG" });
    });

    it("keeps the original finishedAt while the spool stays finished", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 0, isFinished: true, finishedAt: 42 }) });
      await signInAs("user-1");

      await editSpool("spool-1", { ...input, currentWeight: 0 }, template);

      expect(await read("spools/spool-1")).toMatchObject({ isFinished: true, finishedAt: 42 });
    });

    it("unfinishes the spool when it gets weight back", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 0, isFinished: true, finishedAt: 42 }) });
      await signInAs("user-1");

      await editSpool("spool-1", { ...input, currentWeight: 100 }, template);

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 100, isFinished: false, finishedAt: null });
    });

    it("throws without writing when the spool does not exist", async () => {
      await signInAs("user-1");

      // The rules deny reading a missing spool (no owner to check), before the endpoint's own check
      await expect(editSpool("missing", { ...input, currentWeight: 1 })).rejects.toMatchObject({ code: "permission-denied" });
      expect(await read("spools/missing")).toBeUndefined();
    });
  });

  describe("recordSpoolUsage", () => {
    it("takes the print from the spool and logs it", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 500 }) });
      await signInAs("user-1");

      const result = await recordSpoolUsage("spool-1", 11.5);

      expect(result).toEqual({ spool: expect.objectContaining({ id: "spool-1", currentWeight: 488.5, isFinished: false }), carryover: 0 });
      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 488.5, isFinished: false, finishedAt: null });
      expect(Object.values(await list("spools/spool-1/prints"))).toEqual([
        { id: expect.any(String), usedWeight: 11.5, createdAt: expect.any(Number) },
      ]);
    });

    it("runs the spool out: stores only what it had and returns the rest as carryover", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 5 }) });
      await signInAs("user-1");

      const result = await recordSpoolUsage("spool-1", 20);

      expect(result.carryover).toBe(15);
      expect(result.spool).toMatchObject({ currentWeight: 0, isFinished: true, initialWeight: 1000, templateId: "tpl-1" });
      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 0, isFinished: true, finishedAt: expect.any(Number) });
      expect(Object.values(await list("spools/spool-1/prints"))).toMatchObject([{ usedWeight: 5 }]);
    });

    it("computes the carryover from the stored weight, not from what the caller last saw", async () => {
      // The list showed 500 g; another device has since used most of it
      await seed({ "spools/spool-1": spool({ currentWeight: 5 }) });
      await signInAs("user-1");

      const result = await recordSpoolUsage("spool-1", 30);

      expect(result.carryover).toBe(25);
    });

    it("keeps the original finishedAt when the spool was already finished", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 0, isFinished: true, finishedAt: 42 }) });
      await signInAs("user-1");

      const result = await recordSpoolUsage("spool-1", 10);

      expect(result.carryover).toBe(10);
      expect(await read("spools/spool-1")).toMatchObject({ isFinished: true, finishedAt: 42 });
    });

    it("cannot record a print on someone else's spool", async () => {
      await seed({ "spools/spool-1": spool({ userId: "user-2" }) });
      await signInAs("user-1");

      await expect(recordSpoolUsage("spool-1", 10)).rejects.toMatchObject({ code: "permission-denied" });
      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 500 });
    });
  });

  describe("prints", () => {
    it("fetchSpoolPrints returns the prints newest first; fetchLastPrint the newest one", async () => {
      await seed({
        "spools/spool-1": spool(),
        "spools/spool-1/prints/p1": print("p1", 10, 1),
        "spools/spool-1/prints/p3": print("p3", 30, 3),
        "spools/spool-1/prints/p2": print("p2", 20, 2),
      });
      await signInAs("user-1");

      expect((await fetchSpoolPrints("spool-1")).map((p) => p.id)).toEqual(["p3", "p2", "p1"]);
      expect(await fetchLastPrint("spool-1")).toEqual(print("p3", 30, 3));
    });

    it("fetchLastPrint returns null without prints", async () => {
      await seed({ "spools/spool-1": spool() });
      await signInAs("user-1");

      expect(await fetchLastPrint("spool-1")).toBeNull();
    });
  });

  describe("undoLastPrint", () => {
    it("restores the last print's weight and deletes it", async () => {
      await seed({
        "spools/spool-1": spool({ currentWeight: 470 }),
        "spools/spool-1/prints/p1": print("p1", 10, 1),
        "spools/spool-1/prints/p2": print("p2", 20, 2),
      });
      await signInAs("user-1");

      await undoLastPrint("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 490 });
      expect(Object.keys(await list("spools/spool-1/prints"))).toEqual(["p1"]);
    });

    it("undoes a chosen print from the history", async () => {
      await seed({
        "spools/spool-1": spool({ currentWeight: 470 }),
        "spools/spool-1/prints/p1": print("p1", 10, 1),
        "spools/spool-1/prints/p2": print("p2", 20, 2),
      });
      await signInAs("user-1");

      await undoLastPrint("spool-1", "p1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 480 });
      expect(Object.keys(await list("spools/spool-1/prints"))).toEqual(["p2"]);
    });

    it("after a run-out restores only what the spool had and unfinishes it", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 5 }) });
      await signInAs("user-1");
      await recordSpoolUsage("spool-1", 20);

      await undoLastPrint("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 5, isFinished: false, finishedAt: null });
      expect(await list("spools/spool-1/prints")).toEqual({});
    });

    it("after a manual finish restores only that print (the discarded rest stays gone)", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 500 }) });
      await signInAs("user-1");
      await recordSpoolUsage("spool-1", 10);
      await markSpoolAsFinished("spool-1");

      await undoLastPrint("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 10, isFinished: false, finishedAt: null });
    });

    it("keeps the spool finished, with its finishedAt, when a zero-weight print is undone", async () => {
      await seed({
        "spools/spool-1": spool({ currentWeight: 0, isFinished: true, finishedAt: 42 }),
        "spools/spool-1/prints/p1": print("p1", 0, 1),
      });
      await signInAs("user-1");

      await undoLastPrint("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 0, isFinished: true, finishedAt: 42 });
    });

    it("throws noPrintToUndo when there is nothing to undo or the print is already gone", async () => {
      await seed({ "spools/spool-1": spool() });
      await signInAs("user-1");

      await expect(undoLastPrint("spool-1")).rejects.toThrow("tools:errors.noPrintToUndo");
      await expect(undoLastPrint("spool-1", "gone")).rejects.toThrow("tools:errors.noPrintToUndo");
      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 500 });
    });
  });

  describe("markSpoolAsFinished", () => {
    it("finishes the spool at 0 g and stamps finishedAt", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 300 }) });
      await signInAs("user-1");

      await markSpoolAsFinished("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ currentWeight: 0, isFinished: true, finishedAt: expect.any(Number) });
    });

    it("keeps the original finishedAt when the spool is already finished (e.g. in another tab)", async () => {
      await seed({ "spools/spool-1": spool({ currentWeight: 0, isFinished: true, finishedAt: 42 }) });
      await signInAs("user-1");

      await markSpoolAsFinished("spool-1");

      expect(await read("spools/spool-1")).toMatchObject({ finishedAt: 42 });
    });

    it("cannot finish someone else's spool", async () => {
      await seed({ "spools/spool-1": spool({ userId: "user-2" }) });
      await signInAs("user-1");

      await expect(markSpoolAsFinished("spool-1")).rejects.toMatchObject({ code: "permission-denied" });
    });
  });

  describe("deleteSpool", () => {
    it("deletes the spool with its prints", async () => {
      await seed({
        "spools/spool-1": spool(),
        "spools/spool-1/prints/p1": print("p1", 10, 1),
        "spools/spool-1/prints/p2": print("p2", 20, 2),
      });
      await signInAs("user-1");

      await deleteSpool("spool-1");

      expect(await read("spools/spool-1")).toBeUndefined();
      expect(await list("spools/spool-1/prints")).toEqual({});
    });

    it("deletes a spool with more prints than one batch takes, never over 500 writes per batch (#99)", async () => {
      await seed({
        "spools/spool-1": spool(),
        ...Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`spools/spool-1/prints/p${i}`, print(`p${i}`, 1, i)])),
      });
      await signInAs("user-1");
      const batches = trackBatchWrites();

      await deleteSpool("spool-1");

      expect(await read("spools/spool-1")).toBeUndefined();
      expect(await list("spools/spool-1/prints")).toEqual({});
      expect(batches.maxWritesPerBatch()).toBeLessThanOrEqual(500);
      expect(batches.batchCount()).toBeGreaterThan(1);
    }, 60000);
  });
});
