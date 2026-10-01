import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import { updateUserProfile } from "./endpoints";

const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collectionName: string, id: string) => ({
    id,
    collectionName,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
}));

describe("settings users endpoints - updateUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user profile with clean payload without username change", async () => {
    await updateUserProfile("user-1", {
      language: "pl",
      darkMode: true,
      avatarUrl: undefined,
    });

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "user-1" }),
      { language: "pl", darkMode: true },
      { merge: true },
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("handles username change successfully when new username is available", async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false }) // new username doesn't exist
      .mockResolvedValueOnce({ exists: () => true }); // old username exists

    await updateUserProfile(
      "user-1",
      { username: "NewAlice" },
      "oldalice",
    );

    // Reserved new username
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "usernames", id: "newalice" }),
      { uid: "user-1" },
    );
    // Deleted old username
    expect(mockBatchDelete).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "usernames", id: "oldalice" }),
    );
    // Updated user doc
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "user-1" }),
      { username: "NewAlice", usernameLower: "newalice" },
      { merge: true },
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("throws FirebaseError if new username is already taken by another user", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "other-user" }),
    });

    await expect(
      updateUserProfile("user-1", { username: "TakenName" }, "oldalice"),
    ).rejects.toThrow(FirebaseError);
    consoleSpy.mockRestore();
  });
});
