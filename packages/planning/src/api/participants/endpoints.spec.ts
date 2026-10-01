import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEventParticipantsProfiles,
  getGroupMembersAsParticipants,
  searchParticipants,
} from "./endpoints";

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({
    withConverter: vi.fn().mockReturnValue({}),
  })),
  collectionGroup: vi.fn(() => ({
    withConverter: vi.fn().mockReturnValue({}),
  })),
  doc: vi.fn((...args: unknown[]) => args),
  documentId: vi.fn(() => "doc-id-field"),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
}));

describe("participants endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchParticipants", () => {
    it("returns empty array for empty or whitespace query", async () => {
      const results = await searchParticipants("   ");
      expect(results).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it("searches users and public groups, filtering out current user", async () => {
      const mockUserDocs = [
        {
          id: "u-1",
          data: () => ({ username: "Alice", usernameLower: "alice", avatarUrl: "alice.png" }),
        },
        {
          id: "u-2",
          data: () => ({ username: "Bob", usernameLower: "bob" }),
        },
      ];

      const mockGroupDocs = [
        {
          id: "g-1",
          data: () => ({ name: "Boardgamers", nameLower: "boardgamers", avatarUrl: "group.png" }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({ docs: mockUserDocs })
        .mockResolvedValueOnce({ docs: mockGroupDocs })
        .mockResolvedValueOnce({ docs: [] }); // userPrivateGroups query

      const results = await searchParticipants("al", "u-2");

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        type: "user",
        id: "u-1",
        name: "Alice",
        username: "Alice",
        usernameLower: "alice",
        avatarUrl: "alice.png",
      });
      expect(results[1]).toEqual({
        type: "group",
        id: "g-1",
        name: "Boardgamers",
        avatarUrl: "group.png",
      });
    });

    it("searches and includes user private groups when currentUserId is provided", async () => {
      const mockMemberDocs = [
        {
          ref: { parent: { parent: { id: "private-group-1" } } },
        },
        {
          ref: { parent: { parent: { id: "private-group-2" } } },
        },
        {
          ref: { parent: { parent: { id: "private-group-3" } } },
        },
        {
          ref: { parent: { parent: null } },
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({ docs: [] }) // users
        .mockResolvedValueOnce({ docs: [] }) // public groups
        .mockResolvedValueOnce({ docs: mockMemberDocs }); // user private groups members

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: "private-group-1",
          data: () => ({ name: "Secret Club", avatarUrl: "secret.png" }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: "private-group-2",
          data: () => ({}), // name falls back to snap.id: "private-group-2"
        })
        .mockResolvedValueOnce({
          exists: () => false,
          id: "private-group-3",
          data: () => undefined,
        });

      const results = await searchParticipants("secret", "current-user");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: "group",
        id: "private-group-1",
        name: "Secret Club",
        avatarUrl: "secret.png",
      });
    });

    it("handles error in private groups fetch gracefully without failing the entire search", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockGetDocs
        .mockResolvedValueOnce({ docs: [] }) // users
        .mockResolvedValueOnce({ docs: [] }) // public groups
        .mockRejectedValueOnce(new Error("Private groups error")); // user private groups error

      const results = await searchParticipants("test", "current-user");
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch private groups:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("falls back to empty array and logs on error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValueOnce(new Error("Firestore connection failure"));

      const results = await searchParticipants("test");
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getGroupMembersAsParticipants", () => {
    it("fetches members of a group and resolves their user profiles", async () => {
      const mockMembersDocs = [
        {
          id: "u-1",
          data: () => ({ role: "admin" }),
        },
      ];

      const mockUserDocs = [
        {
          id: "u-1",
          data: () => ({
            username: "Alice",
            usernameLower: "alice",
            avatarUrl: "alice.png",
          }),
        },
      ];

      mockGetDocs
        .mockResolvedValueOnce({ docs: mockMembersDocs })
        .mockResolvedValueOnce({ docs: mockUserDocs });

      const results = await getGroupMembersAsParticipants("group-123", "Board Game Club");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: "user",
        id: "u-1",
        name: "Alice",
        username: "Alice",
        usernameLower: "alice",
        avatarUrl: "alice.png",
        groupName: "Board Game Club",
      });
    });

    it("returns empty array when group has no members", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const results = await getGroupMembersAsParticipants("empty-group", "Empty");
      expect(results).toEqual([]);
    });

    it("handles error gracefully when members query fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValueOnce(new Error("Permission denied"));

      const results = await getGroupMembersAsParticipants("group-error", "Group Error");
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getEventParticipantsProfiles", () => {
    it("returns empty array if userIds is empty", async () => {
      const results = await getEventParticipantsProfiles([]);
      expect(results).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it("batches requests and maps returned user profiles", async () => {
      const userIds = ["u-1", "u-2"];
      const mockUserDocs = [
        {
          id: "u-1",
          data: () => ({ username: "Alice", usernameLower: "alice", avatarUrl: "alice.png" }),
        },
        {
          id: "u-2",
          data: () => ({ username: "Bob", usernameLower: "bob", avatarUrl: undefined }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({ docs: mockUserDocs });

      const results = await getEventParticipantsProfiles(userIds);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        type: "user",
        id: "u-1",
        name: "Alice",
        username: "Alice",
        usernameLower: "alice",
        avatarUrl: "alice.png",
      });
      expect(results[1]).toEqual({
        type: "user",
        id: "u-2",
        name: "Bob",
        username: "Bob",
        usernameLower: "bob",
        avatarUrl: undefined,
      });
    });
  });
});
