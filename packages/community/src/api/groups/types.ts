export type GroupType = 'public' | 'private';

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export type GroupPermission = 'editGroup' | 'manageMembers' | 'manageRequests' | 'inviteMembers';

export type ConfigurableGroupRole = 'admin' | 'moderator' | 'member';

export type RolePermissionsMap = Record<ConfigurableGroupRole, Record<GroupPermission, boolean>>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  admin: {
    editGroup: false,
    manageMembers: true,
    manageRequests: true,
    inviteMembers: true,
  },
  moderator: {
    editGroup: false,
    manageMembers: false,
    manageRequests: false,
    inviteMembers: true,
  },
  member: {
    editGroup: false,
    manageMembers: false,
    manageRequests: false,
    inviteMembers: false,
  },
};

import type { Timestamp, FieldValue } from "firebase/firestore";

export type Group = {
  id: string;
  name: string;
  nameLower: string;
  description: string;
  type: GroupType;
  requiresApproval: boolean;
  ownerId: string;
  avatarUrl?: string | null;
  rolePermissions?: Partial<Record<ConfigurableGroupRole, Partial<Record<GroupPermission, boolean>>>>;
  createdAt: number;
  updatedAt: number | Timestamp | FieldValue;
};

export type GroupMember = {
  userId: string;
  role: GroupRole;
  joinedAt: number;
};

export type GroupRequest = {
  userId: string;
  requestedAt: number;
};

export type GroupInvitation = {
  groupId: string;
  groupName: string;
  groupAvatarUrl?: string | null;
  userId: string;
  invitedByUserId: string;
  invitedAt: number;
};
