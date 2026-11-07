import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilamentSpool, SpoolInput } from "./types";
import type { FilamentTemplate } from "../templates/types";
import {
  addSpool,
  deleteSpool,
  editSpool,
  fetchLastPrint,
  fetchSpoolPrints,
  fetchSpools,
  markSpoolAsFinished,
  recordSpoolUsage,
  spoolRefs,
  undoLastPrint,
} from "./endpoints";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockTransactionGet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();
const mockTransactionDelete = vi.fn();
const mockRunTransaction = vi.fn(
  async (
    _db: unknown,
    updateFunction: (transaction: {
      get: typeof mockTransactionGet;
      update: typeof mockTransactionUpdate;
      set: typeof mockTransactionSet;
      delete: typeof mockTransactionDelete;
    }) => Promise<unknown>,
  ) => {
    return updateFunction({
      get: mockTransactionGet,
      update: mockTransactionUpdate,
      set: mockTransactionSet,
      delete: mockTransactionDelete,
    });
  },
);

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, path: string) => ({
    path,
    withConverter: vi.fn().mockReturnValue({ path }),
  })),
  doc: vi.fn((_db: unknown, path?: string, id?: string) => ({
    id: id || "mock-doc-id",
    path: path || "mock-doc-path",
    withConverter: vi.fn().mockReturnValue({ id: id || "mock-doc-id", path: path || "mock-doc-path" }),
  })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  runTransaction: (...args: unknown[]) =>
    mockRunTransaction(
      args[0],
      args[1] as (t: {
        get: typeof mockTransactionGet;
        update: typeof mockTransactionUpdate;
        set: typeof mockTransactionSet;
        delete: typeof mockTransactionDelete;
      }) => Promise<unknown>,
    ),
  writeBatch: vi.fn(() => ({
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
}));

describe("tools spools endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(123456789);
  });

  describe("spoolRefs", () => {
    it("creates collection and document references", () => {
      expect(spoolRefs.spools()).toBeDefined();
      expect(spoolRefs.spool("spool-1")).toBeDefined();
      expect(spoolRefs.prints("spool-1")).toBeDefined();
      expect(spoolRefs.print("spool-1", "print-1")).toBeDefined();
    });
  });

  describe("fetchSpools", () => {
    it("fetches spools and orders them by createdAt descending", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "spool-1",
            data: () => ({ name: "Spool Old", createdAt: 100 }),
          },
          {
            id: "spool-2",
            data: () => ({ name: "Spool New", createdAt: 200 }),
          },
          {
            id: "spool-3",
            data: () => ({ name: "Spool No Date", createdAt: null }),
          },
        ],
      });

      const spools = await fetchSpools("user-1");

      expect(spools).toHaveLength(3);
      expect(spools[0].id).toBe("spool-2");
      expect(spools[1].id).toBe("spool-1");
      expect(spools[2].id).toBe("spool-3");
    });
  });

  describe("addSpool", () => {
    it("adds a new spool with template details and positive weight", async () => {
      const spoolInput: SpoolInput = {
        templateId: "tpl-1",
        name: "My Spool",
        initialWeight: 1000,
        currentWeight: 800,
      };

      const template: FilamentTemplate = {
        id: "tpl-1",
        userId: "user-1",
        material: "PLA",
        type: "Basic",
        colorName: "Jade White",
        colorHex: "#ffffff",
        defaultWeight: 1000,
      };

      const id = await addSpool("user-1", spoolInput, template);

      expect(id).toBe("mock-doc-id");
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: "mock-doc-id",
          userId: "user-1",
          templateId: "tpl-1",
          name: "My Spool",
          initialWeight: 1000,
          currentWeight: 800,
          isFinished: false,
          finishedAt: null,
          material: "PLA",
          type: "Basic",
          colorName: "Jade White",
          colorHex: "#ffffff",
        }),
      );
    });

    it("adds a finished spool when currentWeight is zero and fallback template fields", async () => {
      const spoolInput: SpoolInput = {
        templateId: "tpl-empty",
        name: "Empty Spool",
        initialWeight: 1000,
        currentWeight: 0,
      };

      await addSpool("user-1", spoolInput);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isFinished: true,
          finishedAt: 123456789,
          material: "Unknown",
          type: "Custom",
          colorName: "Default",
          colorHex: "#808080",
        }),
      );
    });
  });

  describe("editSpool", () => {
    const spoolSnap = (data: Partial<FilamentSpool>) => ({ exists: () => true, data: () => data });

    const template: FilamentTemplate = {
      id: "tpl-2",
      userId: "user-1",
      material: "PETG",
      type: "Translucent",
      colorName: "Clear",
      colorHex: "#cccccc",
      defaultWeight: 1000,
    };

    it("updates spool document with template and input data", async () => {
      mockTransactionGet.mockResolvedValueOnce(spoolSnap({ isFinished: false, finishedAt: null }));
      const spoolInput: SpoolInput = {
        templateId: "tpl-2",
        name: "Updated Spool",
        initialWeight: 1000,
        currentWeight: 500,
      };

      await editSpool("spool-1", spoolInput, template);

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          templateId: "tpl-2",
          name: "Updated Spool",
          initialWeight: 1000,
          currentWeight: 500,
          isFinished: false,
          finishedAt: null,
          material: "PETG",
          type: "Translucent",
          colorName: "Clear",
          colorHex: "#cccccc",
        }),
      );
    });

    it("stamps finishedAt when the spool becomes finished, with fallback defaults", async () => {
      mockTransactionGet.mockResolvedValueOnce(spoolSnap({ isFinished: false, finishedAt: null }));
      const spoolInput: SpoolInput = {
        templateId: "tpl-1",
        name: "Depleted Spool",
        initialWeight: 1000,
        currentWeight: -5,
      };

      await editSpool("spool-1", spoolInput);

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isFinished: true,
          finishedAt: 123456789,
          material: "Unknown",
          type: "Custom",
          colorName: "Default",
          colorHex: "#808080",
        }),
      );
    });

    it("keeps the original finishedAt when editing an already finished spool", async () => {
      const originalFinishedAt = 1_000_000;
      mockTransactionGet.mockResolvedValueOnce(spoolSnap({ isFinished: true, finishedAt: originalFinishedAt }));

      await editSpool("spool-1", { templateId: "tpl-1", name: "Renamed", initialWeight: 1000, currentWeight: 0 });

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isFinished: true, finishedAt: originalFinishedAt }),
      );
    });

    it("clears finishedAt when a finished spool gets weight back", async () => {
      mockTransactionGet.mockResolvedValueOnce(spoolSnap({ isFinished: true, finishedAt: 1_000_000 }));

      await editSpool("spool-1", { templateId: "tpl-1", name: "Refilled", initialWeight: 1000, currentWeight: 200 });

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isFinished: false, finishedAt: null }),
      );
    });

    it("throws without writing when the spool does not exist", async () => {
      mockTransactionGet.mockResolvedValueOnce({ exists: () => false });

      await expect(
        editSpool("spool-1", { templateId: "tpl-1", name: "Gone", initialWeight: 1000, currentWeight: 100 }),
      ).rejects.toThrow("Spool not found");

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });
  });

  describe("recordSpoolUsage", () => {
    const baseSpool: FilamentSpool = {
      id: "spool-1",
      userId: "user-1",
      templateId: "tpl-1",
      name: "Test Spool",
      initialWeight: 1000,
      currentWeight: 150,
      isFinished: false,
      material: "PLA",
      type: "Basic",
      colorName: "Black",
      colorHex: "#000000",
    };

    it("throws error when spool document does not exist", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(recordSpoolUsage(baseSpool, 50)).rejects.toThrow("Spool not found");
    });

    it("updates spool weight and logs print entry", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: 150 }),
      });

      const result = await recordSpoolUsage(baseSpool, 50);

      expect(result).toEqual({
        isFinished: false,
        wentBelowZero: false,
        spoolId: "spool-1",
        newWeight: 100,
      });
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 100,
          isFinished: false,
          finishedAt: null,
        }),
      );
      expect(mockTransactionSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          usedWeight: 50,
        }),
      );
    });

    it("handles usage exceeding remaining weight", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: 30 }),
      });

      const result = await recordSpoolUsage(baseSpool, 50);

      expect(result).toEqual({
        isFinished: true,
        wentBelowZero: true,
        spoolId: "spool-1",
        newWeight: 0,
      });
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 0,
          isFinished: true,
          finishedAt: 123456789,
        }),
      );
    });

    it("keeps the original finishedAt when recording a print on an already finished spool", async () => {
      const originalFinishedAt = 1_000_000;
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: 0, isFinished: true, finishedAt: originalFinishedAt }),
      });

      await recordSpoolUsage(baseSpool, 10);

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ currentWeight: 0, isFinished: true, finishedAt: originalFinishedAt }),
      );
    });
  });

  describe("fetchSpoolPrints", () => {
    it("fetches prints and orders them by createdAt descending", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "print-1",
            data: () => ({ usedWeight: 25, createdAt: 10 }),
          },
          {
            id: "print-2",
            data: () => ({ usedWeight: 50, createdAt: 30 }),
          },
        ],
      });

      const prints = await fetchSpoolPrints("spool-1");

      expect(prints).toHaveLength(2);
      expect(prints[0].id).toBe("print-2");
      expect(prints[1].id).toBe("print-1");
    });

    it("handles prints without createdAt when sorting", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "print-nodate",
            data: () => ({ usedWeight: 25, createdAt: null }),
          },
          {
            id: "print-date",
            data: () => ({ usedWeight: 50, createdAt: 100 }),
          },
        ],
      });

      const prints = await fetchSpoolPrints("spool-1");

      expect(prints).toHaveLength(2);
      expect(prints[0].id).toBe("print-date");
      expect(prints[1].id).toBe("print-nodate");
    });
  });

  describe("fetchLastPrint", () => {
    it("returns the latest print", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "latest-print", data: () => ({ usedWeight: 75, createdAt: null }) }],
      });

      const print = await fetchLastPrint("spool-1");

      expect(print).toEqual({ id: "latest-print", usedWeight: 75, createdAt: null });
    });

    it("returns null when the spool has no prints", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      expect(await fetchLastPrint("spool-1")).toBeNull();
    });
  });

  describe("undoLastPrint", () => {
    const printSnap = (usedWeight: number) => ({ exists: () => true, data: () => ({ usedWeight }) });
    const missingSnap = { exists: () => false };

    it("restores the weight read from the print inside the transaction", async () => {
      mockTransactionGet
        .mockResolvedValueOnce(printSnap(50))
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ currentWeight: 100, finishedAt: null }) });

      await undoLastPrint("spool-1", "print-1");

      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 150,
          isFinished: false,
          finishedAt: null,
        }),
      );
      expect(mockTransactionDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "print-1" }));
    });

    it("queries the latest print when printId is not provided", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "latest-print", data: () => ({ usedWeight: 75 }) }],
      });
      mockTransactionGet
        .mockResolvedValueOnce(printSnap(75))
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ currentWeight: 0, finishedAt: 12345 }) });

      await undoLastPrint("spool-1");

      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 75,
          isFinished: false,
          finishedAt: null,
        }),
      );
      expect(mockTransactionDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "latest-print" }));
    });

    it("throws noPrintToUndo without writing when the spool has no prints", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      await expect(undoLastPrint("spool-1")).rejects.toThrow("tools:errors.noPrintToUndo");

      expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it("throws noPrintToUndo without writing when the print was already undone", async () => {
      mockTransactionGet.mockResolvedValueOnce(missingSnap);

      await expect(undoLastPrint("spool-1", "print-1")).rejects.toThrow("tools:errors.noPrintToUndo");

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
      expect(mockTransactionDelete).not.toHaveBeenCalled();
    });

    it("deletes the print when the spool snapshot does not exist", async () => {
      mockTransactionGet.mockResolvedValueOnce(printSnap(50)).mockResolvedValueOnce(missingSnap);

      await undoLastPrint("spool-1", "print-1");

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
      expect(mockTransactionDelete).toHaveBeenCalled();
    });

    it("keeps spool marked as finished when restored weight remains <= 0", async () => {
      mockTransactionGet
        .mockResolvedValueOnce(printSnap(20))
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ currentWeight: -50, finishedAt: 99999 }) });

      await undoLastPrint("spool-1", "print-1");

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: -30,
          isFinished: true,
          finishedAt: 99999,
        }),
      );
      expect(mockTransactionDelete).toHaveBeenCalled();
    });
  });

  describe("deleteSpool", () => {
    it("deletes all prints and the spool document in a batch", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { ref: { id: "p-1" } },
          { ref: { id: "p-2" } },
        ],
      });

      await deleteSpool("spool-1");

      // 2 prints + 1 spool = 3 deletes
      expect(mockBatchDelete).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe("markSpoolAsFinished", () => {
    it("updates spool document to finished with zero weight", async () => {
      await markSpoolAsFinished("spool-1");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 0,
          isFinished: true,
          finishedAt: 123456789,
        }),
      );
    });
  });
});
