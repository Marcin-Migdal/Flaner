import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStartupWaste, updateStartupWaste } from "./endpoints";

const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collectionName: string, id: string) => ({
    collectionName,
    id,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

describe("tools settings endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStartupWaste", () => {
    it("returns startupWaste from firestore when present", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ startupWaste: 2.5 }),
      });

      const res = await getStartupWaste("user-1");
      expect(res).toBe(2.5);
    });

    it("returns 1.5 default when document does not exist", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await getStartupWaste("user-1");
      expect(res).toBe(1.5);
    });

    it("returns 1.5 default on firestore error", async () => {
      mockGetDoc.mockRejectedValueOnce(new Error("Connection error"));

      const res = await getStartupWaste("user-1");
      expect(res).toBe(1.5);
    });
  });

  describe("updateStartupWaste", () => {
    it("updates startupWaste for user doc", async () => {
      await updateStartupWaste("user-1", 3.0);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collectionName: "users", id: "user-1" }),
        { startupWaste: 3.0 },
      );
    });
  });
});
