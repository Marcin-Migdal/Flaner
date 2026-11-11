import { describe, expect, it } from "vitest";
import { type Group, type GroupMember, type GroupRole } from "../../types";
import { getGroupAuthorization, isRolePromotion } from "./getGroupAuthorization";

const group: Group = {
  id: "grp-1",
  name: "Adventurers",
  nameLower: "adventurers",
  description: "",
  type: "private",
  requiresApproval: false,
  ownerId: "owner",
  createdAt: 1000,
  updatedAt: 1000,
};

const member = (userId: string, role: GroupRole): GroupMember => ({ userId, role, joinedAt: 1000 });

const owner = member("owner", "owner");
const admin = member("admin", "admin");
const moderator = member("moderator", "moderator");
const plain = member("member", "member");
const members = [owner, admin, moderator, plain];

const authFor = (userId: string | undefined, g: Group | null = group) =>
  getGroupAuthorization({ group: g, members, userId });

describe("getGroupAuthorization", () => {
  describe("with default role permissions", () => {
    // role (== user id), invite, requests, edit, manage sheet, owner-only, leave
    const cases: [GroupRole, boolean, boolean, boolean, boolean, boolean, boolean][] = [
      ["owner", true, true, true, true, true, false],
      ["admin", true, true, false, true, false, true],
      ["moderator", true, false, false, false, false, true],
      ["member", false, false, false, false, false, true],
    ];

    it.each(cases)(
      "%s: invite=%s, requests=%s, edit=%s, manageSheet=%s, ownerOnly=%s, leave=%s",
      (userId, invite, requests, edit, manageSheet, ownerOnly, leave) => {
        const auth = authFor(userId);

        expect(auth.role).toBe(userId);
        expect(auth.canInvite).toBe(invite);
        expect(auth.canManageRequests).toBe(requests);
        expect(auth.canEditGroup).toBe(edit);
        expect(auth.canOpenManageSheet).toBe(manageSheet);
        expect(auth.isOwner).toBe(ownerOnly);
        expect(auth.canManageRolePermissions).toBe(ownerOnly);
        expect(auth.canDeleteGroup).toBe(ownerOnly);
        expect(auth.canLeave).toBe(leave);
      }
    );
  });

  it("gives a non-member no permission", () => {
    const auth = authFor("stranger");

    expect(auth.role).toBeUndefined();
    expect(auth.canInvite).toBe(false);
    expect(auth.canManageRequests).toBe(false);
    expect(auth.canOpenManageSheet).toBe(false);
    expect(members.some(auth.canManageMember)).toBe(false);
  });

  it("gives nothing without a signed-in user or a group", () => {
    expect(authFor(undefined).role).toBeUndefined();
    expect(authFor("owner", null).canInvite).toBe(false);
    expect(authFor("owner", null).canManageMember(plain)).toBe(false);
  });

  describe("acting on a member", () => {
    it("lets the owner manage everyone but themselves", () => {
      const auth = authFor("owner");

      expect(auth.canManageMember(owner)).toBe(false);
      expect(auth.canManageMember(admin)).toBe(true);
      expect(auth.canManageMember(moderator)).toBe(true);
      expect(auth.canManageMember(plain)).toBe(true);
    });

    it("lets an admin manage only roles below admin", () => {
      const auth = authFor("admin");

      expect(auth.canManageMember(owner)).toBe(false);
      expect(auth.canManageMember(admin)).toBe(false);
      expect(auth.canManageMember(member("admin-2", "admin"))).toBe(false);
      expect(auth.canManageMember(moderator)).toBe(true);
      expect(auth.canManageMember(plain)).toBe(true);
    });

    it("does not let a moderator manage members by default", () => {
      expect(authFor("moderator").canManageMember(plain)).toBe(false);
    });

    it("follows per-group overrides", () => {
      const custom: Group = {
        ...group,
        rolePermissions: { admin: { manageMembers: false }, moderator: { manageMembers: true, editGroup: true } },
      };

      expect(authFor("admin", custom).canManageMember(plain)).toBe(false);
      expect(authFor("admin", custom).canOpenManageSheet).toBe(false);
      expect(authFor("moderator", custom).canOpenManageSheet).toBe(true);
      expect(authFor("moderator", custom).canManageMember(plain)).toBe(true);
      expect(authFor("moderator", custom).canManageMember(admin)).toBe(false);
      expect(authFor("moderator", custom).canEditGroup).toBe(true);
    });
  });

  describe("assignable roles (only below your own)", () => {
    it("owner assigns admin, moderator and member, except the current role", () => {
      const auth = authFor("owner");

      expect(auth.getAssignableRoles(plain)).toEqual(["admin", "moderator"]);
      expect(auth.getAssignableRoles(moderator)).toEqual(["admin", "member"]);
      expect(auth.getAssignableRoles(admin)).toEqual(["moderator", "member"]);
    });

    it("admin never assigns admin", () => {
      const auth = authFor("admin");

      expect(auth.getAssignableRoles(plain)).toEqual(["moderator"]);
      expect(auth.getAssignableRoles(moderator)).toEqual(["member"]);
    });

    it("a moderator with manageMembers can only remove, not reassign, a member", () => {
      const custom: Group = { ...group, rolePermissions: { moderator: { manageMembers: true } } };
      const auth = authFor("moderator", custom);

      expect(auth.canManageMember(plain)).toBe(true);
      expect(auth.getAssignableRoles(plain)).toEqual([]);
    });

    it("offers nothing for members you cannot manage", () => {
      expect(authFor("admin").getAssignableRoles(owner)).toEqual([]);
      expect(authFor("admin").getAssignableRoles(admin)).toEqual([]);
      expect(authFor("member").getAssignableRoles(plain)).toEqual([]);
    });
  });

  describe("ownership transfer", () => {
    it("is offered only to the owner, for any other member", () => {
      const auth = authFor("owner");

      expect(auth.canTransferOwnership(admin)).toBe(true);
      expect(auth.canTransferOwnership(plain)).toBe(true);
      expect(auth.canTransferOwnership(owner)).toBe(false);
    });

    it("is not offered to an admin", () => {
      expect(authFor("admin").canTransferOwnership(plain)).toBe(false);
    });
  });
});

describe("isRolePromotion", () => {
  it("compares role priority", () => {
    expect(isRolePromotion("member", "moderator")).toBe(true);
    expect(isRolePromotion("admin", "moderator")).toBe(false);
    expect(isRolePromotion("moderator", "moderator")).toBe(false);
  });
});
