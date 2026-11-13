import type { NotificationTargets } from "@flaner/shared/api";
import { MFE_NAMES } from "@flaner/shared/constants";

const base = `/${MFE_NAMES.COMMUNITY}`;

const groupPage = ({ groupId }: { groupId?: string }) => (groupId ? `${base}/groups/${groupId}` : `${base}/groups`);

/** Where community's notifications link to (loaded by core through the `./notificationTargets` expose). */
export const notificationTargets: NotificationTargets = {
  friend_request: () => `${base}/friends#friend-requests`,
  friend_request_accepted: () => `${base}/friends`,
  friend_request_rejected: () => `${base}/friends`,
  group_invitation: () => `${base}/groups#group-invitations`,
  group_invitation_accepted: groupPage,
  group_request_accepted: groupPage,
  group_ownership_transferred: groupPage,
  group_invitation_rejected: () => `${base}/groups`,
  group_request_rejected: () => `${base}/groups`,
  group_deleted: () => `${base}/groups`,
};
