import { doc, getDoc, type DocumentReference, type Firestore } from "firebase/firestore";

// Notifications about a pending source (invitation, friend request, event, split group, settlement) get a
// deterministic id, so whoever resolves the source can find and remove them (rules: users.md N4).
export const sourceNotificationRef = (
  firestore: Firestore,
  recipientId: string,
  type: string,
  sourceId: string,
): DocumentReference => doc(firestore, `users/${recipientId}/notifications`, `${type}_${sourceId}`);

/** The refs whose notification still exists and is unread; read notifications are kept (#49). */
export const getUnreadNotificationRefs = async (refs: DocumentReference[]): Promise<DocumentReference[]> => {
  const snaps = await Promise.all(refs.map((ref) => getDoc(ref)));
  return snaps.filter((snap) => snap.exists() && snap.data().read === false).map((snap) => snap.ref);
};
