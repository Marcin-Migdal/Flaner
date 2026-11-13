import type { To } from "react-router";

type GroupNotificationType =
  | "group_invitation"
  | "group_invitation_accepted"
  | "group_invitation_rejected"
  | "group_request_accepted"
  | "group_request_rejected"
  | "group_ownership_transferred"
  | "group_deleted";

export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | GroupNotificationType
  | "event_invitation"
  | "event_reopened"
  | "split_group_invitation"
  | "split_settlement_pending";

/** Stored doc `users/{uid}/notifications/{id}` (rules spec: users.md). */
export type AppNotification = {
  id: string;
  type: NotificationType;
  senderUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  createdAt: number;
  read: boolean;
  groupId?: string;
  groupName?: string;
  eventId?: string;
  eventName?: string;
  splitGroupId?: string;
  splitGroupName?: string;
};

/** Who a notification comes from: a profile (or the signed-in user). */
export type NotificationSender = { uid: string; username: string; avatarUrl?: string };

/** What a pending thing (request, invitation, event, split group, settlement) is: its notification gets the id `{type}_{sourceId}`. */
type Source = { sourceId: string };
type GroupFields = { groupId: string; groupName: string };
type EventFields = { eventId: string; eventName: string };
type SplitGroupFields = { splitGroupId: string; splitGroupName: string };

/**
 * A notification's type with the fields that type needs. Source types carry `sourceId` (deterministic id, so whoever
 * resolves the source can remove the notification, rules N4); outcome types get a random id (rules N5 forbids
 * overwriting someone else's unread notification, which a repeated outcome would do).
 */
export type NotificationContent =
  | ({ type: "friend_request" } & Source)
  | { type: "friend_request_accepted" | "friend_request_rejected" }
  | ({ type: "group_invitation" } & Source & GroupFields)
  | ({ type: Exclude<GroupNotificationType, "group_invitation"> } & GroupFields)
  | ({ type: "event_invitation" | "event_reopened" } & Source & EventFields)
  | ({ type: "split_group_invitation" | "split_settlement_pending" } & Source & SplitGroupFields);

/** Types whose notification has a deterministic id `{type}_{sourceId}`. */
export type SourceNotificationType = Extract<NotificationContent, Source>["type"];

/**
 * Where clicking a notification takes the user (null = nowhere). Each MFE declares the targets of its own types in
 * `src/notificationTargets.ts` (expose `./notificationTargets`), so core holds no MFE paths.
 */
export type NotificationTargets = Partial<Record<NotificationType, (notification: AppNotification) => To | null>>;
