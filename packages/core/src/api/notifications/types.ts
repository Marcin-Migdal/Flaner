export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | "group_invitation"
  | "group_invitation_accepted"
  | "group_invitation_rejected"
  | "group_request_accepted"
  | "group_request_rejected"
  | "group_ownership_transferred"
  | "group_deleted"
  | "system_alert"
  | "event_invitation"
  | "event_reopened"
  | "split_group_invitation"
  | "split_settlement_pending";

export type AppNotification = {
  id: string;
  type: NotificationType;
  senderUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  createdAt: number;
  read: boolean;
  splitGroupId?: string;
  eventId?: string;
  groupId?: string;
  groupName?: string;
};
