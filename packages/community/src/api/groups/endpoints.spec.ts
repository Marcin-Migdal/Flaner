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
  subscribeToGroup,
  subscribeToUserGroupInvitations,
  subscribeToUserGroups,
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

// Unread check of the source notification (real helper reads with getDoc); the tests choose what is still unread
const mockGetUnreadNotificationRefs = vi.fn();
vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  getUnreadNotificationRefs: (...args: unknown[]) => mockGetUnreadNotificationRefs(...args),
}));

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

// getDoc results in call order: the endpoints read [group or invitation, sender profile] in parallel
const mockReads = (...docs: Array<Record<string, unknown> | undefined>) => {
  docs.forEach((data) => mockGetDoc.mockResolvedValueOnce({ exists: () => data !== undefined, data: () => data }));
};
const notificationOf = (type: string) =>
  expect.objectContaining({ type, groupId: "group-1", senderUsername: "Alice", read: false });

describe("community groups endpoints", () => {
  beforeEach(() => {
    mockGetUnreadNotificationRefs.mockResolvedValue([]);
  });

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
      // group doc + owner member doc in one batch
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), { userId: "user-1", role: "owner", joinedAt: expect.any(Number) });
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).not.toHaveBeenCalled();
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
        .mockResolvedValueOnce({
          docs: [
            { ref: { id: "owner-1" }, data: () => ({ role: "owner" }) },
            { ref: { id: "m-1" }, data: () => ({ role: "member" }) },
          ],
        }) // members
        .mockResolvedValueOnce({ docs: [{ ref: { id: "r-1" } }] }) // requests
        .mockResolvedValueOnce({
          docs: [
            { id: "i-1", ref: { id: "i-1" }, data: () => ({ userId: "u-invited" }) },
            { id: "u-fallback", ref: { id: "i-2" }, data: () => ({ userId: undefined }) },
            { id: "", ref: { id: "i-3" }, data: () => ({ userId: "" }) },
          ],
        }); // invitations

      await deleteGroup("group-1");

      // 2 members + 1 request + 3 group-invitations + 2 user-invitations + 1 group-doc = 9
      expect(mockBatchDelete).toHaveBeenCalledTimes(9);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
      // The owner's member doc and the group doc go last, in their own batch
      const deletedIds = mockBatchDelete.mock.calls.map(([ref]) => ref.id);
      expect(deletedIds.slice(-2)).toEqual(["owner-1", "group-1"]);
    });

    it("removes pending invitees' unread group_invitation notifications in the final batch", async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ ref: { id: "owner-1" }, data: () => ({ role: "owner", userId: "owner-1" }) }] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [{ id: "u-invited", ref: { id: "i-1" }, data: () => ({ userId: "u-invited" }) }] });
      mockReads({ name: "Hiking" }, { username: "Alice" });
      const staleRef = { id: "group_invitation_group-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);

      await deleteGroup("group-1");

      expect(mockGetUnreadNotificationRefs).toHaveBeenCalledWith([
        expect.objectContaining({ id: "group_invitation_group-1" }),
      ]);
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
    });

    it("notifies every member except the owner in the final delete batch", async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          docs: [
            { ref: { id: "owner-1" }, data: () => ({ role: "owner", userId: "owner-1" }) },
            { ref: { id: "m-1" }, data: () => ({ role: "member", userId: "m-1" }) },
            { ref: { id: "m-2" }, data: () => ({ role: "admin", userId: "m-2" }) },
          ],
        })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });
      mockReads({ name: "Hiking" }, { username: "Alice" });

      await deleteGroup("group-1");

      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_deleted"));
    });

    it("splits deleting a large group into batches and keeps the owner + group in the last one", async () => {
      const members = Array.from({ length: 600 }, (_, index) => ({
        ref: { id: `m-${index}` },
        data: () => ({ role: "member" }),
      }));
      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ ref: { id: "owner-1" }, data: () => ({ role: "owner" }) }, ...members] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });

      await deleteGroup("group-1");

      // 600 members → 450 + 150, then owner + group
      expect(mockBatchCommit).toHaveBeenCalledTimes(3);
      expect(mockBatchDelete).toHaveBeenCalledTimes(602);
      const deletedIds = mockBatchDelete.mock.calls.map(([ref]) => ref.id);
      expect(deletedIds.slice(-2)).toEqual(["owner-1", "group-1"]);
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

    it("transferGroupOwnership updates owner + roles and notifies the new owner in one batch", async () => {
      mockReads({ name: "Hiking" }, { username: "Alice" });
      await transferGroupOwnership("group-1", "user-1", "user-2");
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_ownership_transferred"));
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
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

    it("acceptJoinRequest adds member, deletes request and notifies the requester", async () => {
      mockReads({ name: "Hiking" }, { username: "Alice" });
      await acceptJoinRequest("group-1", "user-2", "admin-1");
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), { userId: "user-2", role: "member", joinedAt: expect.any(Number) });
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_request_accepted"));
      expect(mockBatchDelete).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("rejectJoinRequest deletes request and notifies the requester in one batch", async () => {
      mockReads({ name: "Hiking" }, { username: "Alice" });
      await rejectJoinRequest("group-1", "user-2", "admin-1");
      expect(mockBatchDelete).toHaveBeenCalledTimes(1);
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_request_rejected"));
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
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
      ).rejects.toThrow("community:errors.notGroupMember");
    });

    it("inviteUserToGroup sets invitation docs and creates notification", async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true }) // invitor is member
        .mockResolvedValueOnce({
          data: () => ({ username: "Alice", avatarUrl: "alice.png" }),
        }); // invitor user profile

      await inviteUserToGroup("group-1", "Hiking", "user-2", "user-1");

      // 2 invitation docs + 1 notification doc in one batch
      expect(mockBatchSet).toHaveBeenCalledTimes(3);
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "group_invitation", senderUsername: "Alice", senderAvatarUrl: "alice.png" }),
      );
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("inviteUserToGroup handles missing invitor username and avatarUrl gracefully", async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true })
        .mockResolvedValueOnce({
          data: () => ({ username: undefined, avatarUrl: undefined }),
        });

      await inviteUserToGroup("group-1", "Hiking", "user-2", "user-1");

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderUsername: "",
          senderAvatarUrl: "",
        }),
      );
    });

    it("acceptGroupInvitation adds member, deletes invitations and notifies the inviter", async () => {
      mockReads({ invitedByUserId: "user-1", groupName: "Hiking" }, { username: "Alice" });
      await acceptGroupInvitation("group-1", "user-2");
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), { userId: "user-2", role: "member", joinedAt: expect.any(Number) });
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_invitation_accepted"));
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("rejectGroupInvitation deletes invitations and notifies the inviter", async () => {
      mockReads({ invitedByUserId: "user-1", groupName: "Hiking" }, { username: "Alice" });
      await rejectGroupInvitation("group-1", "user-2");
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), notificationOf("group_invitation_rejected"));
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("answering an invitation also removes the invitee's own unread group_invitation notification", async () => {
      const staleRef = { path: "users/user-2/notifications/group_invitation_group-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);
      mockReads({ invitedByUserId: "user-1", groupName: "Hiking" }, { username: "Alice" });

      await acceptGroupInvitation("group-1", "user-2");

      expect(mockGetUnreadNotificationRefs).toHaveBeenCalledWith([
        expect.objectContaining({ id: "group_invitation_group-1" }),
      ]);
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
    });

    it("rejectGroupInvitation skips the notification when the invitation is already gone", async () => {
      mockReads(undefined, { username: "Alice" });
      await rejectGroupInvitation("group-1", "user-2");
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchSet).not.toHaveBeenCalled();
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

      subscribeToUserGroupInvitations("user-2", callback, vi.fn());
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

    it("inviteUserToGroup rejects when the batch fails, so no partial invitation is left", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => true }).mockResolvedValueOnce({ data: () => undefined });
      mockBatchCommit.mockRejectedValueOnce(new Error("permission-denied"));

      await expect(inviteUserToGroup("group-1", "Hiking", "user-2", "user-1")).rejects.toThrow("permission-denied");
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

    it("subscribeToUserGroupInvitations handles empty userId, empty docs fallback and passes listener errors on", async () => {
      const emptyUnsub = subscribeToUserGroupInvitations("", vi.fn(), vi.fn());
      expect(typeof emptyUnsub).toBe("function");

      // onNext with empty docs falls back to getUserGroupInvitations
      type SnapCallback = (snap: { docs: Array<{ data: () => unknown }> }) => Promise<void>;
      mockOnSnapshot.mockImplementationOnce((_ref: unknown, onNext: SnapCallback) => {
        onNext({ docs: [] });
        return vi.fn();
      });
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ groupId: "fallback-empty-docs" }) }],
      });
      const callbackEmptyDocs = vi.fn();
      subscribeToUserGroupInvitations("user-2", callbackEmptyDocs, vi.fn());
      await vi.waitFor(() => expect(callbackEmptyDocs).toHaveBeenCalled());

      // A listener error goes to onError, without a fallback query
      const error = new Error("permission-denied");
      mockOnSnapshot.mockImplementationOnce((_ref: unknown, _onNext: unknown, onError: (err: Error) => void) => {
        onError(error);
        return vi.fn();
      });
      const onError = vi.fn();
      const callback = vi.fn();
      subscribeToUserGroupInvitations("user-2", callback, onError);
      expect(onError).toHaveBeenCalledWith(error);
      expect(callback).not.toHaveBeenCalled();
    });
  });
  describe("realtime subscriptions", () => {
    type Listener = { next: (snap: unknown) => void; error: (e: Error) => void; unsubscribe: ReturnType<typeof vi.fn> };
    let listeners: Listener[];

    beforeEach(() => {
      listeners = [];
      mockOnSnapshot.mockImplementation((_target: unknown, next: Listener["next"], error: Listener["error"]) => {
        const unsubscribe = vi.fn();
        listeners.push({ next, error, unsubscribe });
        return unsubscribe;
      });
    });

    const groupSnap = (group: Group | null) => ({ exists: () => group !== null, data: () => group });
    const membersSnap = (groupIds: string[]) => ({
      docs: groupIds.map((id) => ({ ref: { parent: { parent: { id } } } })),
    });

    it("subscribeToGroup reports the group, null when missing and passes a listener error to onError", () => {
      const onUpdate = vi.fn();
      const onError = vi.fn();
      const error = new Error("permission-denied");
      subscribeToGroup("group-1", onUpdate, onError);

      listeners[0].next(groupSnap(mockGroup));
      listeners[0].next(groupSnap(null));
      listeners[0].error(error);

      expect(onUpdate.mock.calls).toEqual([[mockGroup], [null]]);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("subscribeToUserGroups emits once every group has loaded and follows membership changes", () => {
      const onUpdate = vi.fn();
      const unsubscribe = subscribeToUserGroups("user-1", onUpdate, vi.fn());
      const [members] = listeners;
      const groupB: Group = { ...mockGroup, id: "group-2", name: "B" };

      members.next(membersSnap(["group-1", "group-2"]));
      const [, groupAListener, groupBListener] = listeners;

      groupAListener.next(groupSnap(mockGroup));
      expect(onUpdate).not.toHaveBeenCalled(); // group-2 not loaded yet

      groupBListener.next(groupSnap(groupB));
      expect(onUpdate).toHaveBeenLastCalledWith([mockGroup, groupB]);

      // A live rename
      groupBListener.next(groupSnap({ ...groupB, name: "B renamed" }));
      expect(onUpdate).toHaveBeenLastCalledWith([mockGroup, { ...groupB, name: "B renamed" }]);

      // Left group-1: its listener is closed and it drops out of the list
      members.next(membersSnap(["group-2"]));
      expect(groupAListener.unsubscribe).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenLastCalledWith([{ ...groupB, name: "B renamed" }]);

      unsubscribe();
      expect(members.unsubscribe).toHaveBeenCalled();
      expect(groupBListener.unsubscribe).toHaveBeenCalled();
    });

    it("subscribeToUserGroups skips groups that became unreadable and passes a membership query error to onError", () => {
      const onUpdate = vi.fn();
      const onError = vi.fn();
      const error = new Error("failed");
      subscribeToUserGroups("user-1", onUpdate, onError);
      const [members] = listeners;

      members.next(membersSnap(["group-1"]));
      listeners[1].error(new Error("permission-denied"));
      expect(onUpdate).toHaveBeenLastCalledWith([]);
      expect(onError).not.toHaveBeenCalled();

      members.error(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});


