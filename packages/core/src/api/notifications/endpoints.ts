import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, where, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { AppNotification } from "./types";

const refs = {
  notifications: (uid: string) => collection(fb.firestore, `users/${uid}/notifications`).withConverter(firestoreConverter<AppNotification>()),
  notification: (uid: string, notificationId: string) => doc(fb.firestore, `users/${uid}/notifications`, notificationId).withConverter(firestoreConverter<AppNotification>()),
};

/**
 * Subscribes to real-time updates for a user's NEW (unread) notifications.
 * @param uid The user's UID
 * @param onUpdate Callback fired when notifications change
 * @returns Unsubscribe function
 */
export const subscribeToNotifications = (
  uid: string,
  onUpdate: (notifications: AppNotification[]) => void
) => {
  const q = query(
    refs.notifications(uid),
    where("read", "==", false),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => doc.data());
    onUpdate(notifications);
  }, (error) => {
    console.error("Error subscribing to notifications:", error);
  });
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = async (uid: string, notificationId: string): Promise<void> => {
  try {
    await updateDoc(refs.notification(uid, notificationId), { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Marks all currently unread notifications as read.
 */
export const markAllNotificationsAsRead = async (uid: string): Promise<void> => {
  try {
    const unreadQuery = query(
      refs.notifications(uid),
      where("read", "==", false)
    );
    const snapshot = await getDocs(unreadQuery);
    
    if (snapshot.empty) return;

    const batch = writeBatch(fb.firestore);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/**
 * Fetches a page of read notifications for the history tab.
 * @param uid The user's UID
 * @param pageSize Number of items to fetch
 * @param pageParam Cursor (DocumentSnapshot) for pagination
 */
export const getReadNotificationsPage = async (
  uid: string,
  pageSize: number = 15,
  pageParam?: QueryDocumentSnapshot<AppNotification, DocumentData>
) => {
  let q = query(
    refs.notifications(uid),
    where("read", "==", true),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snapshot = await getDocs(q);
  
  const notifications = snapshot.docs.map((doc) => doc.data());
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return {
    notifications,
    nextCursor: lastVisible,
  };
};
