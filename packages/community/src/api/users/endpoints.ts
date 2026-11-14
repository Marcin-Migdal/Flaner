// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/friendRequests.md, users.md (keep their Write flows / Queries in sync).
import type { FriendRequest, Friendship, FriendshipDoc } from "./types";
import { collection, doc, getDocs, query, where, onSnapshot, writeBatch, type FirestoreError, type QueryDocumentSnapshot } from "firebase/firestore";
import {
  createNotification,
  getUnreadNotificationRefs,
  searchUserProfiles,
  sourceNotificationRef,
  userProfileRef,
  type NotificationSender,
} from "@flaner/shared/api";
import { fb } from "@flaner/shared/firebase";
import { type UserProfile } from "@flaner/shared/types";
import { firestoreConverter } from "@flaner/shared/utils";

// The receiver's "friend_request" notification (deterministic id, see sourceNotificationRef)
const friendRequestNotificationRef = (senderUid: string, receiverUid: string) =>
  sourceNotificationRef(receiverUid, "friend_request", senderUid);

const friendshipsRef = (userUid: string) =>
  collection(fb.firestore, `users/${userUid}/friendships`).withConverter(firestoreConverter<FriendshipDoc>());

const friendRequestsRef = () =>
  collection(fb.firestore, "friendRequests").withConverter(firestoreConverter<FriendRequest>());

const toFriendship = (d: QueryDocumentSnapshot<FriendshipDoc>): Friendship => ({ uid: d.id, createdAt: d.data().createdAt });

/** Users whose username starts with `searchQuery`, without the searching user. */
export const searchUsers = async (searchQuery: string, currentUserUid: string): Promise<UserProfile[]> =>
  (await searchUserProfiles(searchQuery, 20)).filter((u) => u.uid !== currentUserUid);

// 2. Send friend request (and write notification to receiver)
export const sendFriendRequest = async (
  sender: NotificationSender,
  receiver: NotificationSender
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  const batch = writeBatch(fb.firestore);

  batch.set(reqRef, {
    senderUid: sender.uid,
    receiverUid: receiver.uid,
    senderUsername: sender.username,
    senderAvatarUrl: sender.avatarUrl || "",
    receiverUsername: receiver.username,
    receiverAvatarUrl: receiver.avatarUrl || "",
    status: "pending",
    createdAt: Date.now(),
  });

  const notification = createNotification(receiver.uid, sender, { type: "friend_request", sourceId: sender.uid });
  batch.set(notification.ref, notification.data);

  await batch.commit();
};

// 3. Cancel friend request
export const cancelFriendRequest = async (senderUid: string, receiverUid: string): Promise<void> => {
  const requestId = `${senderUid}_${receiverUid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  const staleNotifications = await getUnreadNotificationRefs([friendRequestNotificationRef(senderUid, receiverUid)]);
  const batch = writeBatch(fb.firestore);
  batch.delete(reqRef);
  staleNotifications.forEach((ref) => batch.delete(ref));
  await batch.commit();
};

// 4. Accept friend request (creates mutual friendship records, notifies sender).
// One batch: the rules allow the friendships only while the request still exists before the batch.
export const acceptFriendRequest = async (
  sender: NotificationSender,
  receiver: NotificationSender
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  // Both may have sent a request before seeing the other's: the reverse one is resolved by this accept too (#99).
  // A query, not a get: the rules deny reading a request that does not exist.
  const [reverseRequests, staleNotifications] = await Promise.all([
    getDocs(
      query(friendRequestsRef(), where("senderUid", "==", receiver.uid), where("receiverUid", "==", sender.uid)),
    ),
    getUnreadNotificationRefs([
      friendRequestNotificationRef(sender.uid, receiver.uid),
      friendRequestNotificationRef(receiver.uid, sender.uid),
    ]),
  ]);
  const batch = writeBatch(fb.firestore);

  // Delete the request(s) and their unread "friend_request" notifications (own and, for the reverse request, the sender's)
  batch.delete(reqRef);
  reverseRequests.docs.forEach((d) => batch.delete(d.ref));
  staleNotifications.forEach((ref) => batch.delete(ref));

  // Add friendship to receiver (B)'s subcollection
  const friendshipB = doc(fb.firestore, `users/${receiver.uid}/friendships`, sender.uid);
  batch.set(friendshipB, {
    userRef: userProfileRef(sender.uid),
    createdAt: Date.now(),
  });

  // Add friendship to sender (A)'s subcollection
  const friendshipA = doc(fb.firestore, `users/${sender.uid}/friendships`, receiver.uid);
  batch.set(friendshipA, {
    userRef: userProfileRef(receiver.uid),
    createdAt: Date.now(),
  });

  // Notify sender (A) that receiver (B) accepted
  const notification = createNotification(sender.uid, receiver, { type: "friend_request_accepted" });
  batch.set(notification.ref, notification.data);

  await batch.commit();
};

// 5. Reject friend request (deletes request, notifies sender)
export const rejectFriendRequest = async (
  sender: NotificationSender,
  receiver: NotificationSender
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  const staleNotifications = await getUnreadNotificationRefs([friendRequestNotificationRef(sender.uid, receiver.uid)]);
  const batch = writeBatch(fb.firestore);

  // Delete the request (and the receiver's own unread "friend_request" notification)
  batch.delete(reqRef);
  staleNotifications.forEach((ref) => batch.delete(ref));

  // Notify sender (A) that receiver (B) declined
  const notification = createNotification(sender.uid, receiver, { type: "friend_request_rejected" });
  batch.set(notification.ref, notification.data);

  await batch.commit();
};

// 6. Remove friend (deletes both mutual friendship records)
export const removeFriend = async (currentUserUid: string, friendUid: string): Promise<void> => {
  const friendshipB = doc(fb.firestore, `users/${currentUserUid}/friendships`, friendUid);
  const friendshipA = doc(fb.firestore, `users/${friendUid}/friendships`, currentUserUid);
  const batch = writeBatch(fb.firestore);

  batch.delete(friendshipB);
  batch.delete(friendshipA);
  await batch.commit();
};

// Get friends list for a user
export const getFriendsList = async (userUid: string): Promise<Friendship[]> => {
  const snap = await getDocs(friendshipsRef(userUid));
  return snap.docs.map(toFriendship);
};

export const subscribeToFriendsList = (
  userUid: string,
  onUpdate: (friends: Friendship[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  return onSnapshot(friendshipsRef(userUid), (snapshot) => {
    onUpdate(snapshot.docs.map(toFriendship));
  }, onError);
};

// Get sent friend requests for a user
export const getSentFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
  const q = query(
    friendRequestsRef(),
    where("senderUid", "==", userUid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...d.data(),
    id: d.id,
  }));
};

export const subscribeToSentFriendRequests = (
  userUid: string,
  onUpdate: (requests: FriendRequest[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  const q = query(
    friendRequestsRef(),
    where("senderUid", "==", userUid),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    }));
    onUpdate(requests);
  }, onError);
};

// Get received friend requests for a user
export const getReceivedFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
  const q = query(
    friendRequestsRef(),
    where("receiverUid", "==", userUid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...d.data(),
    id: d.id,
  }));
};

export const subscribeToReceivedFriendRequests = (
  userUid: string,
  onUpdate: (requests: FriendRequest[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  const q = query(
    friendRequestsRef(),
    where("receiverUid", "==", userUid),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    }));
    onUpdate(requests);
  }, onError);
};
