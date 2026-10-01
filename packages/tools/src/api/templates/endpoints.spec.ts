import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TemplateInput } from "./types";
import {
  addTemplate,
  deleteTemplate,
  editTemplate,
  fetchAssociatedSpools,
  fetchTemplates,
  templateRefs,
} from "./endpoints";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockBatchUpdate = vi.fn();
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
    id: id || "mock-template-id",
    path: path || "mock-template-path",
    withConverter: vi.fn().mockReturnValue({ id: id || "mock-template-id", path: path || "mock-template-path" }),
  })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  serverTimestamp: vi.fn(() => 123456789),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: vi.fn(() => ({
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
}));

describe("tools templates endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("templateRefs", () => {
    it("creates collection and document references", () => {
      expect(templateRefs.templates()).toBeDefined();
      expect(templateRefs.template("tpl-1")).toBeDefined();
      expect(templateRefs.spools()).toBeDefined();
    });
  });

  describe("fetchTemplates", () => {
    it("fetches templates and orders them by createdAt descending", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "tpl-1",
            data: () => ({ material: "PLA", createdAt: { seconds: 10 } }),
          },
          {
            id: "tpl-2",
            data: () => ({ material: "PETG", createdAt: { seconds: 50 } }),
          },
          {
            id: "tpl-3",
            data: () => ({ material: "ABS", createdAt: null }),
          },
        ],
      });

      const templates = await fetchTemplates("user-1");

      expect(templates).toHaveLength(3);
      expect(templates[0].id).toBe("tpl-2");
      expect(templates[1].id).toBe("tpl-1");
      expect(templates[2].id).toBe("tpl-3");
    });
  });

  describe("addTemplate", () => {
    it("creates a new template with serverTimestamp", async () => {
      const templateInput: TemplateInput = {
        material: "PLA",
        type: "Basic",
        colorName: "Red",
        colorHex: "#ff0000",
        defaultWeight: 1000,
      };

      const id = await addTemplate("user-1", templateInput);

      expect(id).toBe("mock-template-id");
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...templateInput,
          id: "mock-template-id",
          userId: "user-1",
          createdAt: 123456789,
        }),
      );
    });
  });

  describe("editTemplate", () => {
    const templateInput: TemplateInput = {
      material: "PETG",
      type: "HF",
      colorName: "Blue",
      colorHex: "#0000ff",
      defaultWeight: 1000,
    };

    it("updates only template document when propagate is false", async () => {
      await editTemplate("tpl-1", templateInput, false);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          material: "PETG",
          type: "HF",
          colorName: "Blue",
          colorHex: "#0000ff",
          defaultWeight: 1000,
        }),
      );
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("propagates changes to associated spools in batch when propagate is true", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          { ref: { id: "spool-1" } },
          { ref: { id: "spool-2" } },
        ],
      });

      await editTemplate("tpl-1", templateInput, true, "user-1");

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        { id: "spool-1" },
        expect.objectContaining({
          material: "PETG",
          type: "HF",
          colorName: "Blue",
          colorHex: "#0000ff",
        }),
      );
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("does not update batch if propagate is true but no spools exist", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await editTemplate("tpl-1", templateInput, true, "user-1");

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });
  });

  describe("deleteTemplate", () => {
    it("deletes template and unlinks spools by setting templateId to null when deleteSpools is false", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          { ref: { id: "spool-1" } },
        ],
      });

      await deleteTemplate("tpl-1", false, "user-1");

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        { id: "spool-1" },
        { templateId: null },
      );
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("deletes template and cascades deletion to spools when deleteSpools is true", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          { ref: { id: "spool-1" } },
          { ref: { id: "spool-2" } },
        ],
      });

      await deleteTemplate("tpl-1", true, "user-1");

      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("deletes template directly without spools lookup when userId is not provided", async () => {
      await deleteTemplate("tpl-1");

      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("fetchAssociatedSpools", () => {
    it("fetches spools matching userId and templateId", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "spool-1",
            data: () => ({ name: "Spool 1", templateId: "tpl-1" }),
          },
          {
            id: "spool-2",
            data: () => ({ name: "Spool 2", templateId: "tpl-1" }),
          },
        ],
      });

      const spools = await fetchAssociatedSpools("user-1", "tpl-1");

      expect(spools).toHaveLength(2);
      expect(spools[0]).toEqual({ id: "spool-1", name: "Spool 1", templateId: "tpl-1" });
      expect(spools[1]).toEqual({ id: "spool-2", name: "Spool 2", templateId: "tpl-1" });
    });
  });
});
