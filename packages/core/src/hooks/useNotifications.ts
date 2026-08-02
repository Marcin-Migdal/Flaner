import { useState, useEffect } from "react";
import { useAuth } from "@flaner/shared/context";
import { 
  AppNotification, 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../api/notifications";
import { useInvalidateReadNotificationsQuery } from "./api/query/useReadNotifications";

export const useNotifications = () => {
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

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
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
