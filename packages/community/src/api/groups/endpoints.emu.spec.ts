// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { UserProfile } from "@flaner/shared/types";
import { createMockGroup } from "@flaner/test-utils";
import { setupEmulator } from "@flaner/test-utils/emulator";
import type { DocumentData } from "firebase/firestore";
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
import { DEFAULT_ROLE_PERMISSIONS, type GroupInvitation, type GroupRole } from "./types";

const { signInAs, seed, read, list } = setupEmulator();

const OWNER = "user-1";
const MEMBER = "user-2";
const OUTSIDER = "user-3";

const profile = (uid: string, username: string): UserProfile => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl: `${username.toLowerCase()}.png`,
  darkMode: true,
  language: "en",
});

const group = (id: string, overrides: Parameters<typeof createMockGroup>[0] = {}) =>
  createMockGroup({ id, name: `Group ${id}`, nameLower: `group ${id}`, ownerId: OWNER, ...overrides });

const member = (userId: string, role: GroupRole) => ({ userId, role, joinedAt: 1 });

const invitation = (groupId: string, userId: string, invitedByUserId = OWNER): GroupInvitation => ({
  groupId,
  groupName: `Group ${groupId}`,
  groupAvatarUrl: null,
  userId,
  invitedByUserId,
  invitedAt: 1,
});

/** A group with its owner (and the given members), plus the profiles of every user. */
const seedGroup = (id: string, members: Record<string, GroupRole> = {}, overrides: Parameters<typeof createMockGroup>[0] = {}) =>
  seed({
    "users/user-1": profile(OWNER, "Owner"),
    "users/user-2": profile(MEMBER, "Member"),
    "users/user-3": profile(OUTSIDER, "Outsider"),
    [`groups/${id}`]: group(id, overrides),
    [`groups/${id}/members/${OWNER}`]: member(OWNER, "owner"),
    ...Object.fromEntries(Object.entries(members).map(([uid, role]) => [`groups/${id}/members/${uid}`, member(uid, role)])),
  });

const seedInvitation = (groupId: string, userId: string, invitedByUserId = OWNER) =>
  seed({
    [`groups/${groupId}/invitations/${userId}`]: invitation(groupId, userId, invitedByUserId),
    [`users/${userId}/groupInvitations/${groupId}`]: invitation(groupId, userId, invitedByUserId),
  });

const invitationNotification = (groupId: string, read = false) => ({
  id: `group_invitation_${groupId}`,
  type: "group_invitation",
  senderUid: OWNER,
  senderUsername: "Owner",
  senderAvatarUrl: "owner.png",
  groupId,
  groupName: `Group ${groupId}`,
  createdAt: 1,
  read,
});

const inbox = async (uid: string): Promise<DocumentData[]> => Object.values(await list(`users/${uid}/notifications`));

/** The one notification in `uid`'s inbox, with what every group notification carries. */
const expectOnlyNotification = async (uid: string, expected: Record<string, unknown>) => {
  const notifications = await inbox(uid);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toEqual({
    id: expect.any(String),
    createdAt: expect.any(Number),
    read: false,
    ...expected,
  });
};

describe("community groups endpoints", () => {
  describe("create / update / delete", () => {
    it("createGroup stores the group and makes the creator its owner", async () => {
      await signInAs(OWNER);

      const groupId = await createGroup(
        { name: "Hikers", description: "", type: "public", requiresApproval: false, avatarUrl: null },
        OWNER,
      );

      expect(await read(`groups/${groupId}`)).toMatchObject({ id: groupId, name: "Hikers", nameLower: "hikers", ownerId: OWNER });
      expect(await read(`groups/${groupId}/members/${OWNER}`)).toMatchObject({ userId: OWNER, role: "owner" });
    });

    it("updateGroup keeps nameLower in sync with a new name, and leaves it alone otherwise", async () => {
      await seedGroup("g-1");
      await signInAs(OWNER);

      await updateGroup("g-1", { name: "Climbers" });
      expect(await read("groups/g-1")).toMatchObject({ name: "Climbers", nameLower: "climbers" });

      await updateGroup("g-1", { description: "Up" });
      expect(await read("groups/g-1")).toMatchObject({ description: "Up", nameLower: "climbers" });
    });

    it("updateGroupRolePermissions stores the permissions (owner only)", async () => {
      await seedGroup("g-1", { [MEMBER]: "admin" });
      const rolePermissions = { ...DEFAULT_ROLE_PERMISSIONS, member: { ...DEFAULT_ROLE_PERMISSIONS.member, inviteMembers: true } };

      await signInAs(MEMBER);
      await expect(updateGroupRolePermissions("g-1", rolePermissions)).rejects.toMatchObject({ code: "permission-denied" });

      await signInAs(OWNER);
      await updateGroupRolePermissions("g-1", rolePermissions);
      expect(await read("groups/g-1")).toMatchObject({ rolePermissions });
    });

    it("deleteGroup removes the group with its members, requests and invitations (both sides)", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await seedInvitation("g-1", OUTSIDER);
      await seed({ "groups/g-1/requests/user-4": { userId: "user-4", requestedAt: 1 } });
      await signInAs(OWNER);

      await deleteGroup("g-1");

      expect(await read("groups/g-1")).toBeUndefined();
      expect(await list("groups/g-1/members")).toEqual({});
      expect(await list("groups/g-1/requests")).toEqual({});
      expect(await list("groups/g-1/invitations")).toEqual({});
      expect(await list(`users/${OUTSIDER}/groupInvitations`)).toEqual({});
    });

    it("deleteGroup removes pending invitees' unread invitation notifications, keeps read ones, and notifies every member but the owner", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await seedInvitation("g-1", OUTSIDER);
      await seedInvitation("g-1", "user-4");
      await seed({
        [`users/${OUTSIDER}/notifications/group_invitation_g-1`]: invitationNotification("g-1"),
        "users/user-4/notifications/group_invitation_g-1": invitationNotification("g-1", true),
      });
      await signInAs(OWNER);

      await deleteGroup("g-1");

      expect(await inbox(OUTSIDER)).toEqual([]);
      expect(await inbox("user-4")).toEqual([invitationNotification("g-1", true)]);
      expect(await inbox(OWNER)).toEqual([]);
      await expectOnlyNotification(MEMBER, {
        type: "group_deleted",
        senderUid: OWNER,
        senderUsername: "Owner",
        senderAvatarUrl: "owner.png",
        groupId: "g-1",
        groupName: "Group g-1",
      });
    });
  });

  describe("reading groups", () => {
    it("getGroup returns the group, null when it is missing or unreadable", async () => {
      await seedGroup("g-1");
      await seedGroup("private", {}, { type: "private" });
      await signInAs(OUTSIDER);

      expect(await getGroup("g-1")).toMatchObject({ id: "g-1" });
      expect(await getGroup("missing")).toBeNull();
      expect(await getGroup("private")).toBeNull();
    });

    it("searchGlobalGroups finds public groups by name prefix, page by page", async () => {
      await seedGroup("a", {}, { name: "Hikers A", nameLower: "hikers a" });
      await seedGroup("b", {}, { name: "Hikers B", nameLower: "hikers b" });
      await seedGroup("c", {}, { name: "Hikers C", nameLower: "hikers c", type: "private" });
      await seedGroup("d", {}, { name: "Climbers", nameLower: "climbers" });
      await signInAs(OUTSIDER);

      expect(await searchGlobalGroups("  ")).toEqual({ groups: [], nextCursor: undefined });

      const first = await searchGlobalGroups("Hik", 1);
      expect(first.groups.map((g) => g.id)).toEqual(["a"]);
      const second = await searchGlobalGroups("Hik", 1, first.nextCursor);
      expect(second.groups.map((g) => g.id)).toEqual(["b"]);
    });

    it("getUserGroups returns the groups the user is a member of", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await seedGroup("g-2");
      await signInAs(MEMBER);

      expect((await getUserGroups(MEMBER)).map((g) => g.id)).toEqual(["g-1"]);

      await signInAs(OUTSIDER);
      expect(await getUserGroups(OUTSIDER)).toEqual([]);
    });

    it("subscribeToGroup reports the group and its changes", async () => {
      await seedGroup("g-1");
      await signInAs(OWNER);
      const onUpdate = vi.fn();

      const unsubscribe = subscribeToGroup("g-1", onUpdate, vi.fn());
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Group g-1" })));

      await updateGroup("g-1", { name: "Renamed" });
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Renamed" })));
      unsubscribe();
    });

    it("subscribeToUserGroups follows the user's memberships", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await seedGroup("g-2", {}, { type: "public", requiresApproval: false });
      await signInAs(MEMBER);
      const onUpdate = vi.fn();

      const unsubscribe = subscribeToUserGroups(MEMBER, onUpdate, vi.fn());
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ id: "g-1" })]));

      await addGroupMember("g-2", MEMBER);
      await vi.waitFor(() => expect(onUpdate.mock.lastCall?.[0].map((g: { id: string }) => g.id).sort()).toEqual(["g-1", "g-2"]));

      await removeGroupMember("g-1", MEMBER);
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith([expect.objectContaining({ id: "g-2" })]));
      unsubscribe();
    });
  });

  describe("membership", () => {
    it("addGroupMember joins an open public group; removeGroupMember leaves it", async () => {
      await seedGroup("g-1");
      await signInAs(MEMBER);

      await addGroupMember("g-1", MEMBER);
      expect(await read(`groups/g-1/members/${MEMBER}`)).toMatchObject({ role: "member" });

      await removeGroupMember("g-1", MEMBER);
      expect(await read(`groups/g-1/members/${MEMBER}`)).toBeUndefined();
    });

    it("updateGroupMemberRole changes the role; getGroupMembers lists the members", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await signInAs(OWNER);

      await updateGroupMemberRole("g-1", MEMBER, "admin");

      expect((await getGroupMembers("g-1")).map((m) => [m.userId, m.role]).sort()).toEqual([
        [OWNER, "owner"],
        [MEMBER, "admin"],
      ]);
    });

    it("getGroupMembers returns [] when the user may not read them", async () => {
      await seedGroup("g-1");
      await signInAs(OUTSIDER);

      expect(await getGroupMembers("g-1")).toEqual([]);
    });

    it("transferGroupOwnership swaps the roles and notifies the new owner", async () => {
      await seedGroup("g-1", { [MEMBER]: "admin" });
      await signInAs(OWNER);

      await transferGroupOwnership("g-1", OWNER, MEMBER);

      expect(await read("groups/g-1")).toMatchObject({ ownerId: MEMBER });
      expect(await read(`groups/g-1/members/${OWNER}`)).toMatchObject({ role: "admin" });
      expect(await read(`groups/g-1/members/${MEMBER}`)).toMatchObject({ role: "owner" });
      await expectOnlyNotification(MEMBER, {
        type: "group_ownership_transferred",
        senderUid: OWNER,
        senderUsername: "Owner",
        senderAvatarUrl: "owner.png",
        groupId: "g-1",
        groupName: "Group g-1",
      });
    });
  });

  describe("join requests", () => {
    it("requestJoinGroup stores the request; the requester and staff can read it", async () => {
      await seedGroup("g-1", {}, { requiresApproval: true });
      await signInAs(OUTSIDER);

      await requestJoinGroup("g-1", OUTSIDER);
      expect(await getUserGroupRequest("g-1", OUTSIDER)).toMatchObject({ userId: OUTSIDER });

      await signInAs(OWNER);
      expect((await getGroupRequests("g-1")).map((r) => r.userId)).toEqual([OUTSIDER]);
      expect(await getUserGroupRequest("g-1", MEMBER)).toBeNull();
    });

    it("getGroupRequests returns [] for a plain member (no manageRequests)", async () => {
      await seedGroup("g-1", { [MEMBER]: "member" });
      await signInAs(MEMBER);

      expect(await getGroupRequests("g-1")).toEqual([]);
    });

    it.each([
      ["acceptJoinRequest", acceptJoinRequest, "group_request_accepted", true],
      ["rejectJoinRequest", rejectJoinRequest, "group_request_rejected", false],
    ] as const)("%s resolves the request and notifies the requester", async (_, resolve, type, joins) => {
      await seedGroup("g-1", { [MEMBER]: "admin" }, { requiresApproval: true });
      await seed({ [`groups/g-1/requests/${OUTSIDER}`]: { userId: OUTSIDER, requestedAt: 1 } });
      await signInAs(MEMBER);

      await resolve("g-1", OUTSIDER, MEMBER);

      expect(await read(`groups/g-1/requests/${OUTSIDER}`)).toBeUndefined();
      expect(await read(`groups/g-1/members/${OUTSIDER}`)).toEqual(joins ? expect.objectContaining({ role: "member" }) : undefined);
      await expectOnlyNotification(OUTSIDER, {
        type,
        senderUid: MEMBER,
        senderUsername: "Member",
        senderAvatarUrl: "member.png",
        groupId: "g-1",
        groupName: "Group g-1",
      });
    });

    it("a second rejection by another admin adds a new notification instead of overwriting the first", async () => {
      await seedGroup("g-1", { [MEMBER]: "admin", "user-4": "admin" }, { requiresApproval: true });
      await seed({ [`groups/g-1/requests/${OUTSIDER}`]: { userId: OUTSIDER, requestedAt: 1 } });
      await signInAs(MEMBER);
      await rejectJoinRequest("g-1", OUTSIDER, MEMBER);

      await seed({ [`groups/g-1/requests/${OUTSIDER}`]: { userId: OUTSIDER, requestedAt: 2 } });
      await signInAs("user-4");
      await rejectJoinRequest("g-1", OUTSIDER, "user-4");

      expect((await inbox(OUTSIDER)).map((n) => n.senderUid).sort()).toEqual([MEMBER, "user-4"]);
    });
  });

  describe("invitations", () => {
    it("inviteUserToGroup is refused to a non-member", async () => {
      await seedGroup("g-1");
      await signInAs(OUTSIDER);

      // The rules deny a non-member reading the members, before the endpoint's own notGroupMember check
      await expect(inviteUserToGroup("g-1", "Group g-1", MEMBER, OUTSIDER)).rejects.toMatchObject({ code: "permission-denied" });
      expect(await list("groups/g-1/invitations")).toEqual({});
    });

    it("inviteUserToGroup stores the invitation on both sides and the invitee's invitation notification", async () => {
      await seedGroup("g-1");
      await signInAs(OWNER);

      await inviteUserToGroup("g-1", "Group g-1", OUTSIDER, OWNER);

      expect(await read(`groups/g-1/invitations/${OUTSIDER}`)).toMatchObject({ userId: OUTSIDER, invitedByUserId: OWNER });
      expect(await read(`users/${OUTSIDER}/groupInvitations/g-1`)).toMatchObject({ groupName: "Group g-1" });
      expect(await read(`users/${OUTSIDER}/notifications/group_invitation_g-1`)).toEqual({
        ...invitationNotification("g-1"),
        createdAt: expect.any(Number),
      });
    });

    it("inviteUserToGroup sends an empty name / avatar when the inviter has no profile", async () => {
      await seed({ "groups/g-1": group("g-1", { ownerId: "user-9" }), "groups/g-1/members/user-9": member("user-9", "owner") });
      await signInAs("user-9");

      await inviteUserToGroup("g-1", "Group g-1", OUTSIDER, "user-9");

      expect(await read(`users/${OUTSIDER}/notifications/group_invitation_g-1`)).toMatchObject({
        senderUid: "user-9",
        senderUsername: "",
        senderAvatarUrl: "",
      });
    });

    it.each([
      ["acceptGroupInvitation", acceptGroupInvitation, "group_invitation_accepted", true],
      ["rejectGroupInvitation", rejectGroupInvitation, "group_invitation_rejected", false],
    ] as const)(
      "%s resolves the invitation, removes the invitee's unread invitation notification and notifies the inviter",
      async (_, answer, type, joins) => {
        await seedGroup("g-1", {}, { type: "private" });
        await seedInvitation("g-1", OUTSIDER);
        await seed({ [`users/${OUTSIDER}/notifications/group_invitation_g-1`]: invitationNotification("g-1") });
        await signInAs(OUTSIDER);

        await answer("g-1", OUTSIDER);

        expect(await read(`groups/g-1/members/${OUTSIDER}`)).toEqual(joins ? expect.objectContaining({ role: "member" }) : undefined);
        expect(await read(`groups/g-1/invitations/${OUTSIDER}`)).toBeUndefined();
        expect(await read(`users/${OUTSIDER}/groupInvitations/g-1`)).toBeUndefined();
        expect(await inbox(OUTSIDER)).toEqual([]);
        await expectOnlyNotification(OWNER, {
          type,
          senderUid: OUTSIDER,
          senderUsername: "Outsider",
          senderAvatarUrl: "outsider.png",
          groupId: "g-1",
          groupName: "Group g-1",
        });
      },
    );

    it("answering keeps a read invitation notification", async () => {
      await seedGroup("g-1");
      await seedInvitation("g-1", OUTSIDER);
      await seed({ [`users/${OUTSIDER}/notifications/group_invitation_g-1`]: invitationNotification("g-1", true) });
      await signInAs(OUTSIDER);

      await rejectGroupInvitation("g-1", OUTSIDER);

      expect(await inbox(OUTSIDER)).toEqual([invitationNotification("g-1", true)]);
    });

    it("rejectGroupInvitation notifies nobody when the invitation is already gone", async () => {
      await seedGroup("g-1");
      await signInAs(OUTSIDER);

      await rejectGroupInvitation("g-1", OUTSIDER);

      expect(await inbox(OWNER)).toEqual([]);
    });

    it("getUserGroupInvitations / getGroupInvitations read both sides; '' gives []", async () => {
      await seedGroup("g-1");
      await seedInvitation("g-1", OUTSIDER);

      await signInAs(OUTSIDER);
      expect(await getUserGroupInvitations("")).toEqual([]);
      expect(await getUserGroupInvitations(OUTSIDER)).toEqual([invitation("g-1", OUTSIDER)]);

      await signInAs(OWNER);
      expect(await getGroupInvitations("g-1")).toEqual([invitation("g-1", OUTSIDER)]);
    });

    it("getUserGroupInvitations falls back to the group-side invitations when the user's mirror is empty", async () => {
      await seedGroup("g-1");
      await seed({ [`groups/g-1/invitations/${OUTSIDER}`]: invitation("g-1", OUTSIDER) });
      await signInAs(OUTSIDER);

      expect(await getUserGroupInvitations(OUTSIDER)).toEqual([invitation("g-1", OUTSIDER)]);
    });

    it("subscribeToUserGroupInvitations pushes new invitations; '' never subscribes", async () => {
      await seedGroup("g-1");
      await signInAs(OUTSIDER);
      const onUpdate = vi.fn();

      expect(subscribeToUserGroupInvitations("", onUpdate, vi.fn())).toBeTypeOf("function");
      const unsubscribe = subscribeToUserGroupInvitations(OUTSIDER, onUpdate, vi.fn());
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith([]));

      await seedInvitation("g-1", OUTSIDER);
      await vi.waitFor(() => expect(onUpdate).toHaveBeenLastCalledWith([invitation("g-1", OUTSIDER)]));
      unsubscribe();
    });
  });
});
