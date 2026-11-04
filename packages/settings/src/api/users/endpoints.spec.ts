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
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: "user-1" }) }); // old username is ours

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

  it("reserves the username when oldUsernameLower is missing", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await updateUserProfile("user-1", { username: "BrandNew" });

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "usernames", id: "brandnew" }),
      { uid: "user-1" },
    );
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "user-1" }),
      { username: "BrandNew", usernameLower: "brandnew" },
      { merge: true },
    );
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it("reserves an unchanged username that has no reservation yet (legacy profile)", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await updateUserProfile("user-1", { username: "Alice", darkMode: false }, "alice");

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "usernames", id: "alice" }),
      { uid: "user-1" },
    );
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it("saves an unchanged username reserved by someone else without reserving it (legacy collision)", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: "other-user" }) });

    await updateUserProfile("user-1", { username: "Alice", darkMode: false }, "alice");

    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "user-1" }),
      { username: "Alice", usernameLower: "alice", darkMode: false },
      { merge: true },
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("does not release an old reservation that belongs to someone else", async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: "other-user" }) });

    await updateUserProfile("user-1", { username: "Alicia" }, "alice");

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("handles missing old reservation doc when changing username", async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => false,
      })
      .mockResolvedValueOnce({
        exists: () => false,
      });

    await updateUserProfile("user-1", { username: "BrandNewName" }, "old_name");

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });
});
