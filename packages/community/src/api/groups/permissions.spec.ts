import { describe, it, expect } from "vitest";
import {
  hasGroupPermission,
  getGroupRolePermissions,
  getAllGroupRolePermissions,
} from "./permissions";
import { type Group, DEFAULT_ROLE_PERMISSIONS } from "./types";

const mockGroup: Group = {
  id: "grp-1",
  name: "Adventurers",
  nameLower: "adventurers",
  description: "Epic adventures",
  type: "public",
  requiresApproval: false,
  ownerId: "user-1",
  createdAt: 1000,
  updatedAt: 1000,
  rolePermissions: {
    admin: {
      editGroup: true,
      manageMembers: true,
      manageRequests: false,
      inviteMembers: true,
    },
    moderator: {
      editGroup: false,
      manageMembers: false,
      manageRequests: false,
      inviteMembers: false,
    },
    member: {
      editGroup: false,
      manageMembers: false,
      manageRequests: false,
      inviteMembers: false,
    },
  },
};

describe("Group Permissions logic", () => {
  describe("hasGroupPermission", () => {
    it("returns false if group or role is missing", () => {
      expect(hasGroupPermission(null, "owner", "editGroup")).toBe(false);
      expect(hasGroupPermission(undefined, "owner", "editGroup")).toBe(false);
      expect(hasGroupPermission(mockGroup, undefined, "editGroup")).toBe(false);
    });

    it("always returns true for group owner", () => {
      expect(hasGroupPermission(mockGroup, "owner", "editGroup")).toBe(true);
      expect(hasGroupPermission(mockGroup, "owner", "manageMembers")).toBe(true);
      expect(hasGroupPermission(mockGroup, "owner", "manageRequests")).toBe(true);
      expect(hasGroupPermission(mockGroup, "owner", "inviteMembers")).toBe(true);
    });

    it("evaluates custom rolePermissions when provided in group", () => {
      // Overridden in mockGroup for admin:
      expect(hasGroupPermission(mockGroup, "admin", "editGroup")).toBe(true);
      expect(hasGroupPermission(mockGroup, "admin", "manageRequests")).toBe(false);

      // Overridden in mockGroup for moderator:
      expect(hasGroupPermission(mockGroup, "moderator", "inviteMembers")).toBe(false);
    });

    it("falls back to DEFAULT_ROLE_PERMISSIONS when group rolePermissions is undefined", () => {
      const groupWithoutCustomRoles: Group = {
        ...mockGroup,
        rolePermissions: undefined,
      };

      expect(hasGroupPermission(groupWithoutCustomRoles, "admin", "manageMembers")).toBe(
        DEFAULT_ROLE_PERMISSIONS.admin.manageMembers
      );
      expect(hasGroupPermission(groupWithoutCustomRoles, "moderator", "inviteMembers")).toBe(
        DEFAULT_ROLE_PERMISSIONS.moderator.inviteMembers
      );
      expect(hasGroupPermission(groupWithoutCustomRoles, "member", "inviteMembers")).toBe(
        DEFAULT_ROLE_PERMISSIONS.member.inviteMembers
      );
    });

    it("returns false for unhandled roles", () => {
      // @ts-expect-error testing invalid role
      expect(hasGroupPermission(mockGroup, "guest", "editGroup")).toBe(false);
    });
  });

  describe("getGroupRolePermissions", () => {
    it("returns combined role permissions with fallback to defaults", () => {
      const permissions = getGroupRolePermissions(mockGroup, "admin");
      expect(permissions).toEqual({
        editGroup: true,
        manageMembers: true,
        manageRequests: false,
        inviteMembers: true,
      });
    });

    it("returns full defaults when group is null or has no custom permissions", () => {
      const permissions = getGroupRolePermissions(null, "moderator");
      expect(permissions).toEqual(DEFAULT_ROLE_PERMISSIONS.moderator);
    });
  });

  describe("getAllGroupRolePermissions", () => {
    it("returns complete map for admin, moderator and member", () => {
      const all = getAllGroupRolePermissions(mockGroup);
      expect(all).toHaveProperty("admin");
      expect(all).toHaveProperty("moderator");
      expect(all).toHaveProperty("member");
      expect(all.admin.editGroup).toBe(true);
      expect(all.moderator.inviteMembers).toBe(false);
    });
  });
});
