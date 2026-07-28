export type GroupType = 'public' | 'private';

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export type Group = {
  id: string;
  name: string;
  nameLower: string;
  description: string;
  type: GroupType;
  requiresApproval: boolean;
  ownerId: string;
  avatarUrl?: string | null;
  createdAt: number;
  updatedAt: number;
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

export type FriendRequest = {
  id: string;
  senderUid: string;
  receiverUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  receiverUsername: string;
  receiverAvatarUrl: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

export type Friendship = {
  userRef: any;
  username: string;
  usernameLower: string;
  avatarUrl?: string;
  createdAt: number;
  uid: string;
};

export type GroupInvitation = {
  groupId: string;
  groupName: string;
  groupAvatarUrl?: string | null;
  userId: string;
  invitedByUserId: string;
  invitedAt: number;
};
