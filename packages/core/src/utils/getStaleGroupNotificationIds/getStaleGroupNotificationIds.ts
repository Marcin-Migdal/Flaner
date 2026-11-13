import type { AppNotification } from "@flaner/shared/api";

/**
 * When a group is deleted, its "group_deleted" notification is the only one worth keeping: the ids of the
 * other unread notifications about that group (accepted / rejected, requests, ownership...) are stale (#49).
 */
export const getStaleGroupNotificationIds = (unread: AppNotification[]): string[] => {
  const deletedGroupIds = new Set(
    unread.flatMap((notification) =>
      notification.type === "group_deleted" && notification.groupId ? [notification.groupId] : [],
    ),
  );

  return unread
    .filter(
      (notification) =>
        notification.type !== "group_deleted" &&
        !notification.read &&
        notification.groupId !== undefined &&
        deletedGroupIds.has(notification.groupId),
    )
    .map((notification) => notification.id);
};
