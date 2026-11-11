import {
  type ConfigurableGroupRole,
  type Group,
  type GroupMember,
  type GroupPermission,
  type GroupRole,
} from "../../types";
import { GROUP_ROLE_PRIORITY, hasGroupPermission } from "../permissions";

const ASSIGNABLE_ROLES: ConfigurableGroupRole[] = ["admin", "moderator", "member"];

type GroupAuthorizationInput = {
  group: Group | null | undefined;
  members: GroupMember[];
  userId: string | undefined;
};

export type GroupAuthorization = {
  /** The current user's role; undefined for non-members */
  role: GroupRole | undefined;
  isOwner: boolean;
  canInvite: boolean;
  canManageRequests: boolean;
  canEditGroup: boolean;
  canManageRolePermissions: boolean;
  canDeleteGroup: boolean;
  /** Edit the group or manage members */
  canOpenManageSheet: boolean;
  /** The owner leaves only by ownership transfer or by deleting the group */
  canLeave: boolean;
  /** Remove the member or change their role: `manageMembers` and a strictly higher role priority, never yourself */
  canManageMember: (member: GroupMember) => boolean;
  /** Roles below your own, except the member's current role */
  getAssignableRoles: (member: GroupMember) => ConfigurableGroupRole[];
  canTransferOwnership: (member: GroupMember) => boolean;
};

export const isRolePromotion = (from: GroupRole, to: GroupRole): boolean =>
  GROUP_ROLE_PRIORITY[to] > GROUP_ROLE_PRIORITY[from];

/**
 * Answers every group permission question the UI asks, for the current user.
 * Mirrors the Firestore rules (`groups.md` in the rules spec), which remain the server-side check.
 */
export const getGroupAuthorization = ({ group, members, userId }: GroupAuthorizationInput): GroupAuthorization => {
  const role = userId ? members.find((m) => m.userId === userId)?.role : undefined;
  const priority = role ? GROUP_ROLE_PRIORITY[role] : 0;
  const isOwner = role === "owner";
  const can = (permission: GroupPermission) => hasGroupPermission(group, role, permission);

  const canEditGroup = can("editGroup");
  const canManageMembers = can("manageMembers");

  const canManageMember = (member: GroupMember) =>
    canManageMembers && member.userId !== userId && priority > GROUP_ROLE_PRIORITY[member.role];

  return {
    role,
    isOwner,
    canInvite: can("inviteMembers"),
    canManageRequests: can("manageRequests"),
    canEditGroup,
    canManageRolePermissions: isOwner,
    canDeleteGroup: isOwner,
    canOpenManageSheet: canEditGroup || canManageMembers,
    canLeave: !isOwner,
    canManageMember,
    getAssignableRoles: (member) =>
      canManageMember(member)
        ? ASSIGNABLE_ROLES.filter((r) => r !== member.role && priority > GROUP_ROLE_PRIORITY[r])
        : [],
    canTransferOwnership: (member) => isOwner && member.userId !== userId,
  };
};
