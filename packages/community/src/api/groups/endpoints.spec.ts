import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS, type Group } from "./types";
import {
  acceptGroupInvitation,
  acceptJoinRequest,
  addGroupMember,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupInvitations,
  getGroupMembers,
  getGroupRequests,
  getUserGroupInvitations,
  getUserGroupRequest,
  getUserGroups,
  inviteUserToGroup,
  rejectGroupInvitation,
  rejectJoinRequest,
  removeGroupMember,
  requestJoinGroup,
  searchGlobalGroups,
  subscribeToUserGroupInvitations,
  transferGroupOwnership,
  updateGroup,
  updateGroupMemberRole,
  updateGroupRolePermissions,
} from "./endpoints";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchUpdate = vi.fn();
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
  collectionGroup: vi.fn((_db: unknown, name: string) => ({
    name,
    withConverter: vi.fn().mockReturnValue({ name }),
  })),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    id: parts[parts.length - 1] || "mock-doc-id",
    path: parts.join("/"),
    withConverter: vi.fn().mockReturnValue({ id: parts[parts.length - 1] || "mock-doc-id" }),
  })),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  startAfter: vi.fn((cursor: unknown) => ({ cursor })),
  serverTimestamp: vi.fn(() => 123456789),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    delete: mockBatchDelete,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}));

const mockGroup: Group = {
  id: "group-1",
  name: "Hiking Enthusiasts",
  nameLower: "hiking enthusiasts",
  description: "Mountain hiking group",
  type: "public",
  requiresApproval: false,
  ownerId: "user-1",
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  createdAt: 1000,
  updatedAt: 1000,
};

describe("community groups endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGroup, updateGroup, updateGroupRolePermissions, deleteGroup", () => {
    it("creates a new group and adds owner as member", async () => {
      const input = {
        name: "Hiking Enthusiasts",
        description: "Mountain hiking group",
        type: "public" as const,
        requiresApproval: false,
        rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      };

      const groupId = await createGroup(input, "user-1");

      expect(groupId).toBeDefined();
      expect(mockSetDoc).toHaveBeenCalledTimes(2); // group doc + owner member doc
    });

    it("updates group with nameLower when name is modified", async () => {
      await updateGroup("group-1", { name: "New Name" });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "New Name",
          nameLower: "new name",
        }),
      );
    });

    it("updates group without nameLower when name is not modified", async () => {
      await updateGroup("group-1", { description: "New Description" });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: "New Description",
        }),
      );
    });

    it("updates group role permissions", async () => {
      await updateGroupRolePermissions("group-1", DEFAULT_ROLE_PERMISSIONS);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rolePermissions: mockGroup.rolePermissions,
        }),
      );
    });

    it("deletes group with all members, requests, invitations cascading", async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ ref: { id: "m-1" } }] }) // members
        .mockResolvedValueOnce({ docs: [{ ref: { id: "r-1" } }] }) // requests
        .mockResolvedValueOnce({
          docs: [
            { id: "i-1", ref: { id: "i-1" }, data: () => ({ userId: "u-invited" }) },
            { id: "u-fallback", ref: { id: "i-2" }, data: () => ({ userId: undefined }) },
            { id: "", ref: { id: "i-3" }, data: () => ({ userId: "" }) },
          ],
        }); // invitations

      await deleteGroup("group-1");

      // 1 member + 1 request + 3 group-invitations + 2 user-invitations + 1 group-doc = 8
      expect(mockBatchDelete).toHaveBeenCalledTimes(8);
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe("getGroup, searchGlobalGroups, getUserGroups", () => {
    it("getGroup returns group data if exists", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGroup,
      });

      const res = await getGroup("group-1");
      expect(res).toEqual(mockGroup);
    });

    it("getGroup returns null if not found", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await getGroup("non-existent");
      expect(res).toBeNull();
    });

    it("searchGlobalGroups returns empty array when query is empty", async () => {
      const res = await searchGlobalGroups("   ");
      expect(res.groups).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it("searchGlobalGroups fetches public groups", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => mockGroup }],
      });

      const res = await searchGlobalGroups("hiking");
      expect(res.groups).toHaveLength(1);
      expect(res.groups[0].name).toBe("Hiking Enthusiasts");
      expect(res.nextCursor).toBeUndefined();
    });

    it("searchGlobalGroups returns nextCursor when results match pageSize", async () => {
      const tenDocs = Array.from({ length: 10 }, (_, i) => ({
        data: () => ({ ...mockGroup, id: `g-${i}` }),
      }));
      mockGetDocs.mockResolvedValueOnce({
        docs: tenDocs,
      });

      const res = await searchGlobalGroups("hiking", 10, undefined);
      expect(res.groups).toHaveLength(10);
      expect(res.nextCursor).toBe(tenDocs[9]);
    });

    it("getUserGroups queries members collectionGroup and fetches group details", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            ref: {
              parent: {
                parent: { id: "group-1" },
              },
            },
          },
        ],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGroup,
      });

      const res = await getUserGroups("user-1");
      expect(res).toEqual([mockGroup]);
    });

    it("getUserGroups skips deleted groups that return null", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            ref: {
              parent: {
                parent: { id: "group-1" },
              },
            },
          },
          {
            ref: {
              parent: {
                parent: { id: "group-deleted" },
              },
            },
          },
        ],
      });

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockGroup,
        })
        .mockResolvedValueOnce({
          exists: () => false,
        });

      const res = await getUserGroups("user-1");
      expect(res).toEqual([mockGroup]);
    });
  });

  describe("Membership operations & Transfer ownership", () => {
    it("addGroupMember adds member with specified role", async () => {
      await addGroupMember("group-1", "user-2", "admin");
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: "user-2", role: "admin" }),
      );
    });

    it("removeGroupMember deletes member doc", async () => {
      await removeGroupMember("group-1", "user-2");
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("updateGroupMemberRole updates role of member", async () => {
      await updateGroupMemberRole("group-1", "user-2", "moderator" as const);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ role: "moderator" }),
      );
    });

    it("transferGroupOwnership updates group owner and member roles in batch", async () => {
      await transferGroupOwnership("group-1", "user-1", "user-2");
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe("Join requests operations", () => {
    it("requestJoinGroup creates join request", async () => {
      await requestJoinGroup("group-1", "user-2");
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: "user-2" }),
      );
    });

    it("acceptJoinRequest adds member and deletes request", async () => {
      await acceptJoinRequest("group-1", "user-2");
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("rejectJoinRequest deletes request", async () => {
      await rejectJoinRequest("group-1", "user-2");
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("getGroupMembers returns members", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ userId: "user-1", role: "owner" }) }],
      });
      const res = await getGroupMembers("group-1");
      expect(res).toHaveLength(1);
    });

    it("getGroupRequests returns requests", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ userId: "user-2", requestedAt: 100 }) }],
      });
      const res = await getGroupRequests("group-1");
      expect(res).toHaveLength(1);
    });

    it("getUserGroupRequest returns request if exists", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: "user-2" }),
      });
      const res = await getUserGroupRequest("group-1", "user-2");
      expect(res).toEqual({ userId: "user-2" });
    });

    it("getUserGroupRequest returns null if not found or on error", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });
      const res1 = await getUserGroupRequest("group-1", "user-2");
      expect(res1).toBeNull();

      mockGetDoc.mockRejectedValueOnce(new Error("Network fail"));
      const res2 = await getUserGroupRequest("group-1", "user-2");
      expect(res2).toBeNull();
    });
  });

  describe("Group invitations operations", () => {
    it("inviteUserToGroup throws error if invitor is not group member", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(
        inviteUserToGroup("group-1", "Hiking", "user-2", "user-outsider"),
      ).rejects.toThrow("Nie jesteś członkiem tej grupy");
    });

    it("inviteUserToGroup sets invitation docs and creates notification", async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true }) // invitor is member
        .mockResolvedValueOnce({
          data: () => ({ username: "Alice", avatarUrl: "alice.png" }),
        }); // invitor user profile

      await inviteUserToGroup("group-1", "Hiking", "user-2", "user-1");

      // 2 invitation docs + 1 notification doc
      expect(mockSetDoc).toHaveBeenCalledTimes(3);
    });

    it("inviteUserToGroup handles missing invitor username and avatarUrl gracefully", async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true })
        .mockResolvedValueOnce({
          data: () => ({ username: undefined, avatarUrl: undefined }),
        });

      await inviteUserToGroup("group-1", "Hiking", "user-2", "user-1");

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderUsername: "",
          senderAvatarUrl: "",
        }),
      );
    });

    it("acceptGroupInvitation adds member and deletes invitations", async () => {
      await acceptGroupInvitation("group-1", "user-2");
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });

    it("rejectGroupInvitation deletes invitations", async () => {
      await rejectGroupInvitation("group-1", "user-2");
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });

    it("getUserGroupInvitations returns empty array when userId is empty", async () => {
      const res = await getUserGroupInvitations("");
      expect(res).toEqual([]);
    });

    it("getUserGroupInvitations returns invitations from user subcollection", async () => {
      const inv = {
        groupId: "group-1",
        groupName: "Hiking",
        userId: "user-2",
        invitedByUserId: "user-1",
        invitedAt: 100,
      };
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => inv }],
      });

      const res = await getUserGroupInvitations("user-2");
      expect(res).toEqual([inv]);
    });

    it("getUserGroupInvitations falls back to collectionGroup when user subcollection is empty", async () => {
      const inv = {
        groupId: "group-cg",
        groupName: "Climbing",
        userId: "user-2",
      };
      mockGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({ empty: false, docs: [{ data: () => inv }] });

      const res = await getUserGroupInvitations("user-2");
      expect(res).toEqual([inv]);
    });

    it("getUserGroupInvitations handles errors in user subcollection and collectionGroup query", async () => {
      mockGetDocs
        .mockRejectedValueOnce(new Error("Subcollection query failed"))
        .mockRejectedValueOnce(new Error("CollectionGroup query failed"));

      const res = await getUserGroupInvitations("user-2");
      expect(res).toEqual([]);
    });

    it("subscribeToUserGroupInvitations invokes callback", () => {
      const inv = {
        groupId: "group-1",
        groupName: "Hiking",
        userId: "user-2",
        invitedByUserId: "user-1",
        invitedAt: 100,
      };
      const callback = vi.fn();
      mockOnSnapshot.mockImplementationOnce((_ref: unknown, onNext: (snap: { docs: { data: () => object }[] }) => void) => {
        onNext({ docs: [{ data: () => inv }] });
        return vi.fn();
      });

      subscribeToUserGroupInvitations("user-2", callback);
      expect(callback).toHaveBeenCalledWith([inv]);
    });

    it("getGroupInvitations fetches invitations for group", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [{ data: () => ({ userId: "user-2" }) }] });
      const res = await getGroupInvitations("group-1");
      expect(res).toHaveLength(1);
    });

    it("getGroup returns null on error", async () => {
      mockGetDoc.mockRejectedValueOnce(new Error("Network error"));
      const res = await getGroup("group-1");
      expect(res).toBeNull();
    });

    it("searchGlobalGroups supports pageParam", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const res = await searchGlobalGroups("test", 10, { id: "cursor" } as never);
      expect(res.groups).toEqual([]);
    });

    it("getUserGroups returns empty array when member has no groups", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const res = await getUserGroups("user-1");
      expect(res).toEqual([]);
    });

    it("getGroupMembers returns empty array on error", async () => {
      mockGetDocs.mockRejectedValueOnce(new Error("Failed"));
      const res = await getGroupMembers("group-1");
      expect(res).toEqual([]);
    });

    it("getGroupRequests returns empty array on error", async () => {
      mockGetDocs.mockRejectedValueOnce(new Error("Failed"));
      const res = await getGroupRequests("group-1");
      expect(res).toEqual([]);
    });

    it("getUserGroupRequest returns null on error", async () => {
      mockGetDoc.mockRejectedValueOnce(new Error("Failed"));
      const res = await getUserGroupRequest("group-1", "user-1");
      expect(res).toBeNull();
    });

    it("inviteUserToGroup handles notification creation error gracefully", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => true });
      mockSetDoc
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Notification failed"));

      await expect(
        inviteUserToGroup("group-1", "Hiking", "user-2", "user-1")
      ).resolves.not.toThrow();
    });

    it("getUserGroupInvitations handles empty userId and collectionGroup fallback", async () => {
      expect(await getUserGroupInvitations("")).toEqual([]);

      // First call (userInvitations) throws -> falls back to collectionGroup
      mockGetDocs
        .mockRejectedValueOnce(new Error("Permission denied"))
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ groupId: "g-cg", userId: "u-cg" }) }],
        });

      const res = await getUserGroupInvitations("user-2");
      expect(res).toEqual([{ groupId: "g-cg", userId: "u-cg" }]);

      // Both throw -> returns empty array
      mockGetDocs
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"));

      const emptyRes = await getUserGroupInvitations("user-2");
      expect(emptyRes).toEqual([]);
    });

    it("subscribeToUserGroupInvitations handles empty userId, fallback, and error callback", async () => {
      const emptyUnsub = subscribeToUserGroupInvitations("", vi.fn());
      expect(typeof emptyUnsub).toBe("function");

      const callback = vi.fn();
      // Test onError callback with fallback
      mockOnSnapshot.mockImplementationOnce(
        (
          _ref: unknown,
          _onNext: unknown,
          onError: (err: Error) => Promise<void>
        ) => {
          onError(new Error("Firestore listener error"));
          return vi.fn();
        }
      );
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ groupId: "fallback-group" }) }],
      });

      subscribeToUserGroupInvitations("user-2", callback);
      await Promise.resolve();

      // Test onNext with empty docs falling back to getUserGroupInvitations
      type SnapCallback = (snap: { docs: Array<{ data: () => unknown }> }) => Promise<void>;
      mockOnSnapshot.mockImplementationOnce(
        (
          _ref: unknown,
          onNext: SnapCallback,
        ) => {
          onNext({ docs: [] });
          return vi.fn();
        }
      );
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ groupId: "fallback-empty-docs" }) }],
      });
      const callbackEmptyDocs = vi.fn();
      subscribeToUserGroupInvitations("user-2", callbackEmptyDocs);
      await Promise.resolve();
      await Promise.resolve();
      expect(callbackEmptyDocs).toHaveBeenCalled();

      // Test onError fallback throwing error -> catch block
      type ErrorCallback = (err: Error) => Promise<void>;
      mockOnSnapshot.mockImplementationOnce(
        (
          _ref: unknown,
          _onNext: unknown,
          onError: ErrorCallback
        ) => {
          onError(new Error("Initial error"));
          return vi.fn();
        }
      );
      mockGetDocs
        .mockRejectedValueOnce(new Error("Fallback error 1"))
        .mockRejectedValueOnce(new Error("Fallback error 2"));
      const callbackCatch = vi.fn();
      subscribeToUserGroupInvitations("user-2", callbackCatch);
      await vi.waitFor(() => {
        expect(callbackCatch).toHaveBeenCalledWith([]);
      });

      // Cover line 376 catch block
      mockOnSnapshot.mockImplementationOnce(
        (
          _ref: unknown,
          _onNext: unknown,
          onError: ErrorCallback
        ) => {
          onError(new Error("Initial error"));
          return vi.fn();
        }
      );
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ groupId: "fallback" }) }],
      });
      const errorThrowingCallback = vi.fn().mockImplementationOnce(() => {
        throw new Error("Callback error");
      });
      subscribeToUserGroupInvitations("user-2", errorThrowingCallback);
      await vi.waitFor(() => {
        expect(errorThrowingCallback).toHaveBeenCalledWith([]);
      });
    });
  });
});

