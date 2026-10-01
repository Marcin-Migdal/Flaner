import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addLookupColor,
  addLookupMaterial,
  addLookupType,
  deleteLookupColor,
  deleteLookupMaterial,
  deleteLookupType,
  fetchLookupColors,
  fetchLookupMaterials,
  fetchLookupTypes,
  updateLookupColorHex,
  lookupRefs,
} from "./endpoints";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

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
    id: id || "generated-id",
    path: path || "generated-path",
    withConverter: vi.fn().mockReturnValue({ id: id || "generated-id", path: path || "generated-path" }),
  })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  serverTimestamp: vi.fn(() => 123456789),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: vi.fn(() => ({
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
}));

describe("tools lookups endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Fetch lookups", () => {
    it("fetchLookupMaterials returns materials for user", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "m-1", data: () => ({ name: "PLA" }) }],
      });

      const res = await fetchLookupMaterials("user-1");
      expect(res).toEqual([{ id: "m-1", name: "PLA" }]);
    });

    it("fetchLookupTypes returns types for user", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "t-1", data: () => ({ materialName: "PLA", name: "Basic" }) }],
      });

      const res = await fetchLookupTypes("user-1");
      expect(res).toEqual([{ id: "t-1", materialName: "PLA", name: "Basic" }]);
    });

    it("fetchLookupColors returns colors for user", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "c-1", data: () => ({ materialName: "PLA", typeName: "Basic", name: "Black", hex: "#000000" }) }],
      });

      const res = await fetchLookupColors("user-1");
      expect(res).toEqual([{ id: "c-1", materialName: "PLA", typeName: "Basic", name: "Black", hex: "#000000" }]);
    });
  });

  describe("Add lookups", () => {
    it("addLookupMaterial returns existing id if duplicate exists", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "existing-m" }],
      });

      const res = await addLookupMaterial("user-1", { name: "PLA" });
      expect(res).toBe("existing-m");
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("addLookupMaterial creates new material if not present", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
      });

      const res = await addLookupMaterial("user-1", { name: "PETG" });
      expect(res).toBe("generated-id");
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it("addLookupType returns existing id or creates new", async () => {
      mockGetDocs
        .mockResolvedValueOnce({ empty: false, docs: [{ id: "existing-t" }] })
        .mockResolvedValueOnce({ empty: true });

      const res1 = await addLookupType("user-1", { materialName: "PLA", name: "Basic" });
      expect(res1).toBe("existing-t");

      const res2 = await addLookupType("user-1", { materialName: "PLA", name: "Matte" });
      expect(res2).toBe("generated-id");
    });

    it("addLookupColor updates hex if color exists but hex changed", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "c-1", data: () => ({ hex: "#111111" }) }],
      });

      const res = await addLookupColor("user-1", {
        materialName: "PLA",
        typeName: "Basic",
        name: "Black",
        hex: "#000000",
      });

      expect(res).toBe("c-1");
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { hex: "#000000" },
      );
    });

    it("addLookupColor creates new color if not present", async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: true });

      const res = await addLookupColor("user-1", {
        materialName: "PLA",
        typeName: "Basic",
        name: "White",
        hex: "#ffffff",
      });

      expect(res).toBe("generated-id");
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  describe("Update & Delete lookups", () => {
    it("updateLookupColorHex updates hex on color doc", async () => {
      await updateLookupColorHex("c-1", "#ff0000");
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { hex: "#ff0000" },
      );
    });

    it("deleteLookupMaterial cascade deletes matching types and colors", async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [{ ref: { id: "t-1" }, data: () => ({ materialName: "pla" }) }],
        })
        .mockResolvedValueOnce({
          docs: [{ ref: { id: "c-1" }, data: () => ({ materialName: "pla" }) }],
        });

      await deleteLookupMaterial("user-1", "m-1", "PLA");

      // 1 material + 1 type + 1 color = 3 deletes in batch
      expect(mockBatchDelete).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("deleteLookupType cascade deletes matching colors", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ ref: { id: "c-1" }, data: () => ({ materialName: "pla", typeName: "basic" }) }],
      });

      await deleteLookupType("user-1", "t-1", "PLA", "Basic");

      // 1 type + 1 color = 2 deletes in batch
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("deleteLookupColor deletes color document", async () => {
      await deleteLookupColor("c-1");
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("provides document refs for individual lookups", () => {
      expect(lookupRefs.material("m1")).toBeDefined();
      expect(lookupRefs.type("t1")).toBeDefined();
      expect(lookupRefs.color("c1")).toBeDefined();
    });
  });
});
