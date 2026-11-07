// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/friendRequests.md, users.md (keep their Write flows / Queries in sync).
import type { FriendRequest, Friendship, FriendshipDoc } from "./types";
import { collection, doc, documentId, getDocs, getDoc, query, where, limit, onSnapshot, writeBatch, type QueryDocumentSnapshot } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { type UserProfile } from "@flaner/shared/types";
import { firestoreConverter, getUnreadNotificationRefs, sourceNotificationRef } from "@flaner/shared/utils";

// The receiver's "friend_request" notification (deterministic id, see sourceNotificationRef)
const friendRequestNotificationRef = (senderUid: string, receiverUid: string) =>
  sourceNotificationRef(fb.firestore, receiverUid, "friend_request", senderUid);

// Firestore caps `in` filters at 30 values
const FIRESTORE_IN_LIMIT = 30;

const friendshipsRef = (userUid: string) =>
  collection(fb.firestore, `users/${userUid}/friendships`).withConverter(firestoreConverter<FriendshipDoc>());

const toFriendship = (d: QueryDocumentSnapshot<FriendshipDoc>): Friendship => ({ uid: d.id, createdAt: d.data().createdAt });

/**
 * Live profiles of `uids` (one `in` listener per 30 ids), emitted once every chunk has answered.
 * A uid missing from the result has no profile: the account was deleted.
 */
export const subscribeToUsers = (uids: string[], onUpdate: (users: UserProfile[]) => void) => {
  const unique = Array.from(new Set(uids));
  if (unique.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const usersRef = collection(fb.firestore, "users").withConverter(firestoreConverter<UserProfile>());
  const chunks = Array.from({ length: Math.ceil(unique.length / FIRESTORE_IN_LIMIT) }, (_, i) =>
    unique.slice(i * FIRESTORE_IN_LIMIT, (i + 1) * FIRESTORE_IN_LIMIT),
  );
  const byChunk: (UserProfile[] | undefined)[] = chunks.map(() => undefined);

  const unsubscribes = chunks.map((chunk, index) =>
    onSnapshot(
      query(usersRef, where(documentId(), "in", chunk)),
      (snapshot) => {
        byChunk[index] = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }));
        if (byChunk.every((users) => users !== undefined)) onUpdate(byChunk.flatMap((users) => users ?? []));
      },
      (error) => console.error("subscribeToUsers failed:", error),
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

// Fetch multiple users by their UIDs
export const getUsers = async (uids: string[]): Promise<UserProfile[]> => {
  if (!uids || uids.length === 0) return [];
  
  // To avoid hitting Firestore for duplicate IDs, get unique UIDs
  const uniqueUids = Array.from(new Set(uids));

  // For simplicity and avoiding the 10-item limit of 'in' queries,
  // we fetch individually. In production with many members, this should be batched.
  const promises = uniqueUids.map(async (uid) => {
    const snap = await getDoc(doc(fb.firestore, "users", uid));
    if (snap.exists()) {
      return { ...snap.data(), uid: snap.id } as UserProfile;
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((u): u is UserProfile => u !== null);
};

// 1. Search users by username (prefix match, case-insensitive)
export const searchUsers = async (searchQuery: string, currentUserUid: string): Promise<UserProfile[]> => {
  if (!searchQuery.trim()) return [];
  const qLower = searchQuery.toLowerCase();
  
  const q = query(
    collection(fb.firestore, "users"),
    where("usernameLower", ">=", qLower),
    where("usernameLower", "<=", qLower + "\uf8ff"),
    limit(20)
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { ...data, uid: d.id } as UserProfile;
    })
    .filter((u) => u.uid !== currentUserUid);
};

// 2. Send friend request (and write notification to receiver)
export const sendFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  try {
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

    // Create notification for receiver
    const notifRef = friendRequestNotificationRef(sender.uid, receiver.uid);
    batch.set(notifRef, {
      id: notifRef.id,
      type: "friend_request",
      senderUid: sender.uid,
      senderUsername: sender.username,
      senderAvatarUrl: sender.avatarUrl || "",
      createdAt: Date.now(),
      read: false,
    });

    await batch.commit();
  } catch (error) {
    console.error("sendFriendRequest failed:", error);
    throw error;
  }
};

// 3. Cancel friend request
export const cancelFriendRequest = async (senderUid: string, receiverUid: string): Promise<void> => {
  try {
    const requestId = `${senderUid}_${receiverUid}`;
    const reqRef = doc(fb.firestore, "friendRequests", requestId);
    const staleNotifications = await getUnreadNotificationRefs([friendRequestNotificationRef(senderUid, receiverUid)]);
    const batch = writeBatch(fb.firestore);
    batch.delete(reqRef);
    staleNotifications.forEach((ref) => batch.delete(ref));
    await batch.commit();
  } catch (error) {
    console.error("cancelFriendRequest failed:", error);
    throw error;
  }
};

// 4. Accept friend request (creates mutual friendship records, notifies sender).
// One batch: the rules allow the friendships only while the request still exists before the batch.
export const acceptFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  try {
    const requestId = `${sender.uid}_${receiver.uid}`;
    const reqRef = doc(fb.firestore, "friendRequests", requestId);
    const staleNotifications = await getUnreadNotificationRefs([friendRequestNotificationRef(sender.uid, receiver.uid)]);
    const batch = writeBatch(fb.firestore);

    // Delete the request (and the receiver's own unread "friend_request" notification)
    batch.delete(reqRef);
    staleNotifications.forEach((ref) => batch.delete(ref));

    // Add friendship to receiver (B)'s subcollection
    const friendshipB = doc(fb.firestore, `users/${receiver.uid}/friendships`, sender.uid);
    batch.set(friendshipB, {
      userRef: doc(fb.firestore, "users", sender.uid),
      createdAt: Date.now(),
    });

    // Add friendship to sender (A)'s subcollection
    const friendshipA = doc(fb.firestore, `users/${sender.uid}/friendships`, receiver.uid);
    batch.set(friendshipA, {
      userRef: doc(fb.firestore, "users", receiver.uid),
      createdAt: Date.now(),
    });

    // Create notification for sender (A) notifying that receiver (B) accepted
    const notifRef = doc(collection(fb.firestore, `users/${sender.uid}/notifications`));
    batch.set(notifRef, {
      id: notifRef.id,
      type: "friend_request_accepted",
      senderUid: receiver.uid,
      senderUsername: receiver.username,
      senderAvatarUrl: receiver.avatarUrl || "",
      createdAt: Date.now(),
      read: false,
    });

    await batch.commit();
  } catch (error) {
    console.error("acceptFriendRequest failed:", error);
    throw error;
  }
};

// 5. Reject friend request (deletes request, notifies sender)
export const rejectFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  try {
    const requestId = `${sender.uid}_${receiver.uid}`;
    const reqRef = doc(fb.firestore, "friendRequests", requestId);
    const staleNotifications = await getUnreadNotificationRefs([friendRequestNotificationRef(sender.uid, receiver.uid)]);
    const batch = writeBatch(fb.firestore);

    // Delete the request (and the receiver's own unread "friend_request" notification)
    batch.delete(reqRef);
    staleNotifications.forEach((ref) => batch.delete(ref));

    // Create notification for sender (A) notifying that receiver (B) declined
    const notifRef = doc(collection(fb.firestore, `users/${sender.uid}/notifications`));
    batch.set(notifRef, {
      id: notifRef.id,
      type: "friend_request_rejected",
      senderUid: receiver.uid,
      senderUsername: receiver.username,
      senderAvatarUrl: receiver.avatarUrl || "",
      createdAt: Date.now(),
      read: false,
    });

    await batch.commit();
  } catch (error) {
    console.error("rejectFriendRequest failed:", error);
    throw error;
  }
};

// 6. Remove friend (deletes both mutual friendship records)
export const removeFriend = async (currentUserUid: string, friendUid: string): Promise<void> => {
  try {
    const friendshipB = doc(fb.firestore, `users/${currentUserUid}/friendships`, friendUid);
    const friendshipA = doc(fb.firestore, `users/${friendUid}/friendships`, currentUserUid);
    const batch = writeBatch(fb.firestore);

    batch.delete(friendshipB);
    batch.delete(friendshipA);
    await batch.commit();
  } catch (error) {
    console.error("removeFriend failed:", error);
    throw error;
  }
};

// Get friends list for a user
export const getFriendsList = async (userUid: string): Promise<Friendship[]> => {
  try {
    const snap = await getDocs(friendshipsRef(userUid));
    return snap.docs.map(toFriendship);
  } catch (error) {
    console.error("getFriendsList failed:", error);
    throw error;
  }
};

export const subscribeToFriendsList = (
  userUid: string,
  onUpdate: (friends: Friendship[]) => void
) => {
  return onSnapshot(friendshipsRef(userUid), (snapshot) => {
    onUpdate(snapshot.docs.map(toFriendship));
  }, (error) => {
    console.error("subscribeToFriendsList failed:", error);
  });
};

// Get sent friend requests for a user
export const getSentFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
  try {
    const q = query(
      collection(fb.firestore, "friendRequests"),
      where("senderUid", "==", userUid),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as FriendRequest[];
  } catch (error) {
    console.error("getSentFriendRequests failed:", error);
    throw error;
  }
};

export const subscribeToSentFriendRequests = (
  userUid: string,
  onUpdate: (requests: FriendRequest[]) => void
) => {
  const q = query(
    collection(fb.firestore, "friendRequests"),
    where("senderUid", "==", userUid),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as FriendRequest[];
    onUpdate(requests);
  }, (error) => {
    console.error("subscribeToSentFriendRequests failed:", error);
  });
};

// Get received friend requests for a user
export const getReceivedFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
  try {
    const q = query(
      collection(fb.firestore, "friendRequests"),
      where("receiverUid", "==", userUid),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as FriendRequest[];
  } catch (error) {
    console.error("getReceivedFriendRequests failed:", error);
    throw error;
  }
};

export const subscribeToReceivedFriendRequests = (
  userUid: string,
  onUpdate: (requests: FriendRequest[]) => void
) => {
  const q = query(
    collection(fb.firestore, "friendRequests"),
    where("receiverUid", "==", userUid),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as FriendRequest[];
    onUpdate(requests);
  }, (error) => {
    console.error("subscribeToReceivedFriendRequests failed:", error);
  });
};
