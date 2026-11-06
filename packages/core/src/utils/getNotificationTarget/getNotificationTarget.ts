import type { To } from "react-router";
import type { AppNotification } from "../../api/notifications";

/** Where clicking a notification (popover card or toast) takes the user; null = nowhere. */
export const getNotificationTarget = ({ type, groupId, eventId, splitGroupId }: AppNotification): To | null => {
  switch (type) {
    case "friend_request":
      return "/community/friends#friend-requests";
    case "friend_request_accepted":
      return "/community/friends";
    case "group_invitation":
      return "/community/groups#group-invitations";
    case "group_invitation_accepted":
    case "group_request_accepted":
    case "group_ownership_transferred":
      return groupId ? `/community/groups/${groupId}` : null;
    case "group_invitation_rejected":
    case "group_request_rejected":
    case "group_deleted":
      return "/community/groups";
    case "event_invitation":
    case "event_reopened":
      return { pathname: "/planning/scheduling", hash: eventId ?? "" };
    case "split_group_invitation":
    case "split_settlement_pending":
      return { pathname: "/planning/splits", hash: splitGroupId ?? "" };
    default:
      return null;
  }
};
