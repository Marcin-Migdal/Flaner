import { useState, useEffect, useEffectEvent } from "react";
import { useAuth } from "@flaner/shared/context";
import { 
  AppNotification, 
  deleteNotifications,
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../../api/notifications";
import { getStaleGroupNotificationIds } from "../../utils/getStaleGroupNotificationIds";
import { useInvalidateReadNotificationsQuery } from "../api/query/useReadNotifications";

type UseNotificationsOptions = {
  /** Notifications that arrived while the app was open (not the ones already there on load) */
  onNew?: (notifications: AppNotification[]) => void;
};

export const useNotifications = ({ onNew }: UseNotificationsOptions = {}) => {
  const { user } = useAuth();
  const invalidateReadNotifications = useInvalidateReadNotificationsQuery();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(!user?.uid ? false : true);
  const [prevUid, setPrevUid] = useState(user?.uid);

  if (user?.uid !== prevUid) {
    setPrevUid(user?.uid);
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  const handleNew = useEffectEvent((added: AppNotification[]) => onNew?.(added));

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications, added) => {
      setNotifications(newNotifications);
      setLoading(false);
      if (added.length > 0) handleNew(added);

      // A deleted group leaves only its "group_deleted" notification; the listener then drops the rest
      const staleIds = getStaleGroupNotificationIds(newNotifications);
      if (staleIds.length > 0) {
        deleteNotifications(user.uid, staleIds).catch((error) =>
          console.error("Failed to remove stale group notifications", error),
        );
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid) return;
    
    // Optimistic UI update
    setNotifications((prev) => 
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    
    try {
      await markNotificationAsRead(user.uid, notificationId);
      invalidateReadNotifications();
    } catch (error) {
      // Revert on error could be implemented here if needed
      console.error("Failed to mark as read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid || unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllNotificationsAsRead(user.uid);
      invalidateReadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
};
