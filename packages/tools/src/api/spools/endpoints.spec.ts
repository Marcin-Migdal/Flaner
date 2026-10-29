import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilamentSpool, SpoolInput } from "./types";
import type { FilamentTemplate } from "../templates/types";
import {
  addSpool,
  deleteSpool,
  editSpool,
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
  serverTimestamp: vi.fn(() => 123456789),
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
            data: () => ({ name: "Spool Old", createdAt: { seconds: 100 } }),
          },
          {
            id: "spool-2",
            data: () => ({ name: "Spool New", createdAt: { seconds: 200 } }),
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
    it("updates spool document with template and input data", async () => {
      const spoolInput: SpoolInput = {
        templateId: "tpl-2",
        name: "Updated Spool",
        initialWeight: 1000,
        currentWeight: 500,
      };

      const template: FilamentTemplate = {
        id: "tpl-2",
        userId: "user-1",
        material: "PETG",
        type: "Translucent",
        colorName: "Clear",
        colorHex: "#cccccc",
        defaultWeight: 1000,
      };

      await editSpool("spool-1", spoolInput, template);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
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

    it("updates spool document as finished when currentWeight <= 0 with fallback defaults", async () => {
      const spoolInput: SpoolInput = {
        templateId: "tpl-1",
        name: "Depleted Spool",
        initialWeight: 1000,
        currentWeight: -5,
      };

      await editSpool("spool-1", spoolInput);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
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
  });

  describe("fetchSpoolPrints", () => {
    it("fetches prints and orders them by createdAt descending", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "print-1",
            data: () => ({ usedWeight: 25, createdAt: { seconds: 10 } }),
          },
          {
            id: "print-2",
            data: () => ({ usedWeight: 50, createdAt: { seconds: 30 } }),
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
            data: () => ({ usedWeight: 50, createdAt: { seconds: 100 } }),
          },
        ],
      });

      const prints = await fetchSpoolPrints("spool-1");

      expect(prints).toHaveLength(2);
      expect(prints[0].id).toBe("print-date");
      expect(prints[1].id).toBe("print-nodate");
    });
  });

  describe("undoLastPrint", () => {
    it("uses provided printId and usedWeight directly", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: 100, finishedAt: null }),
      });

      await undoLastPrint("spool-1", "print-1", 50);

      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentWeight: 150,
          isFinished: false,
          finishedAt: null,
        }),
      );
      expect(mockTransactionDelete).toHaveBeenCalled();
    });

    it("queries the latest print when parameters are not provided", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "latest-print",
            data: () => ({ usedWeight: 75 }),
          },
        ],
      });

      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: 0, finishedAt: 12345 }),
      });

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
      expect(mockTransactionDelete).toHaveBeenCalled();
    });

    it("does nothing when prints query is empty", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await undoLastPrint("spool-1");

      expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it("handles non-existing spool snapshot during undoLastPrint transaction", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => false,
      });

      await undoLastPrint("spool-1", "print-1", 50);

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
      expect(mockTransactionDelete).toHaveBeenCalled();
    });

    it("keeps spool marked as finished when restored weight remains <= 0", async () => {
      mockTransactionGet.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ currentWeight: -50, finishedAt: 99999 }),
      });

      await undoLastPrint("spool-1", "print-1", 20);

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
