// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md (keep its Write flows / Queries in sync).
// The one module that builds and removes notifications (#86); the inbox (read / mark as read) lives in core.
import { collection, doc, getDoc, type DocumentReference, type Transaction } from "firebase/firestore";
import { fb } from "../../firebase";
import { firestoreConverter } from "../../utils/firestoreConverter";
import { getUserProfile } from "../users";
import type { AppNotification, NotificationContent, NotificationSender, SourceNotificationType } from "./types";

export const notificationsRef = (uid: string) =>
  collection(fb.firestore, `users/${uid}/notifications`).withConverter(firestoreConverter<AppNotification>());

/** The recipient's notification about a pending source (deterministic id, rules N4). */
export const sourceNotificationRef = (
  recipientId: string,
  type: SourceNotificationType,
  sourceId: string,
): DocumentReference<AppNotification> => doc(notificationsRef(recipientId), `${type}_${sourceId}`);

/** The sender of `uid`'s notifications, from their profile (empty name / avatar when the profile is gone). */
export const getNotificationSender = async (uid: string): Promise<NotificationSender> =>
  (await getUserProfile(uid)) ?? { uid, username: "" };

/** A new unread notification for `recipientId`: write it with `batch.set(ref, data)` / `transaction.set(ref, data)`. */
export const createNotification = (
  recipientId: string,
  sender: NotificationSender,
  content: NotificationContent,
): { ref: DocumentReference<AppNotification>; data: AppNotification } => {
  const { ref, fields } = withRef(recipientId, content);
  return {
    ref,
    data: {
      ...fields,
      id: ref.id,
      senderUid: sender.uid,
      senderUsername: sender.username,
      senderAvatarUrl: sender.avatarUrl ?? "",
      createdAt: Date.now(),
      read: false,
    },
  };
};

const withRef = (recipientId: string, content: NotificationContent) => {
  if ("sourceId" in content) {
    const { sourceId, ...fields } = content;
    return { ref: sourceNotificationRef(recipientId, content.type, sourceId), fields };
  }
  return { ref: doc(notificationsRef(recipientId)), fields: content };
};

/** The refs whose notification still exists and is unread, for deleting in a batch; read notifications are kept (#49). */
export const getUnreadNotificationRefs = async (
  refs: DocumentReference<AppNotification>[],
): Promise<DocumentReference<AppNotification>[]> => {
  const snaps = await Promise.all(refs.map((ref) => getDoc(ref)));
  return snaps.filter((snap) => snap.data()?.read === false).map((snap) => snap.ref);
};

/**
 * Inside a transaction (reads first): returns a function that deletes the notification only while it exists and is
 * unread. Call it after the transaction's other reads.
 */
export const deleteIfUnread = async (transaction: Transaction, ref: DocumentReference<AppNotification>) => {
  const snap = await transaction.get(ref);
  return () => {
    if (snap.data()?.read === false) transaction.delete(ref);
  };
};
