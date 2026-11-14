// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md (keep their Write flows / Queries in sync).
// The inbox (read side); notifications are built and removed by `@flaner/shared/api` (#86).
import { query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, where, limit, startAfter, type QueryDocumentSnapshot, type DocumentData, type FirestoreError } from "firebase/firestore";
import { notificationsRef, type AppNotification } from "@flaner/shared/api";
import { fb } from "@flaner/shared/firebase";

const refs = {
  notifications: notificationsRef,
  notification: (uid: string, notificationId: string) => doc(notificationsRef(uid), notificationId),
};

/**
 * Subscribes to real-time updates for a user's NEW (unread) notifications.
 * @param uid The user's UID
 * @param onUpdate Callback fired when notifications change, with the ones that arrived while subscribed (`added`)
 * @returns Unsubscribe function
 */
export const subscribeToNotifications = (
  uid: string,
  onUpdate: (notifications: AppNotification[], added: AppNotification[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  const q = query(
    refs.notifications(uid),
    where("read", "==", false),
    orderBy("createdAt", "desc")
  );

  // Until the first server snapshot everything is "already there": the persistent cache answers first,
  // then the server adds what came while the app was closed. Only later additions are new (#37).
  // One created after subscribing is new even if it comes with that first server snapshot (#106).
  let synced = false;
  const subscribedAt = Date.now();

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => doc.data());
    const added = snapshot
      .docChanges()
      .flatMap((change) => (change.type === "added" ? [change.doc.data()] : []))
      .filter((notification) => synced || notification.createdAt > subscribedAt);
    if (!snapshot.metadata.fromCache) synced = true;
    onUpdate(notifications, added);
  }, onError);
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = async (uid: string, notificationId: string): Promise<void> => {
  await updateDoc(refs.notification(uid, notificationId), { read: true });
};

/**
 * Marks all currently unread notifications as read.
 */
export const markAllNotificationsAsRead = async (uid: string): Promise<void> => {
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
};

/**
 * Deletes some of the user's own notifications (stale ones, see getStaleGroupNotificationIds).
 */
export const deleteNotifications = async (uid: string, notificationIds: string[]): Promise<void> => {
  const batch = writeBatch(fb.firestore);
  notificationIds.forEach((id) => batch.delete(refs.notification(uid, id)));
  await batch.commit();
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
): Promise<{
  notifications: AppNotification[];
  nextCursor?: QueryDocumentSnapshot<AppNotification, DocumentData>;
}> => {
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
