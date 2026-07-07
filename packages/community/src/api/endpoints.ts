import { collection, doc, setDoc, getDocs, deleteDoc, query, where, limit } from "firebase/firestore";
import { fb, type UserType } from "@flaner-v2/shared";

export interface FriendRequest {
  id: string;
  senderUid: string;
  receiverUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  receiverUsername: string;
  receiverAvatarUrl: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
}

export interface Friendship {
  userRef: any;
  username: string;
  usernameLower: string;
  createdAt: number;
  uid: string; // The friend's UID
}

// 1. Search users by username (prefix match, case-insensitive)
export const searchUsers = async (searchQuery: string, currentUserUid: string): Promise<UserType[]> => {
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
      return { ...data, uid: d.id } as UserType;
    })
    .filter((u) => u.uid !== currentUserUid);
};

// 2. Send friend request (and write notification to receiver)
export const sendFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  
  await setDoc(reqRef, {
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
  const notifRef = doc(collection(fb.firestore, `users/${receiver.uid}/notifications`));
  await setDoc(notifRef, {
    id: notifRef.id,
    type: "friend_request",
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderAvatarUrl: sender.avatarUrl || "",
    createdAt: Date.now(),
    read: false,
  });
};

// 3. Cancel friend request
export const cancelFriendRequest = async (senderUid: string, receiverUid: string): Promise<void> => {
  const requestId = `${senderUid}_${receiverUid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  await deleteDoc(reqRef);
};

// 4. Accept friend request (creates mutual friendship records, notifies sender)
export const acceptFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  
  // Delete the request
  await deleteDoc(reqRef);

  // Add friendship to receiver (B)'s subcollection
  const friendshipB = doc(fb.firestore, `users/${receiver.uid}/friendships`, sender.uid);
  await setDoc(friendshipB, {
    userRef: doc(fb.firestore, "users", sender.uid),
    username: sender.username,
    usernameLower: sender.username.toLowerCase(),
    createdAt: Date.now(),
  });

  // Add friendship to sender (A)'s subcollection
  const friendshipA = doc(fb.firestore, `users/${sender.uid}/friendships`, receiver.uid);
  await setDoc(friendshipA, {
    userRef: doc(fb.firestore, "users", receiver.uid),
    username: receiver.username,
    usernameLower: receiver.username.toLowerCase(),
    createdAt: Date.now(),
  });

  // Create notification for sender (A) notifying that receiver (B) accepted
  const notifRef = doc(collection(fb.firestore, `users/${sender.uid}/notifications`));
  await setDoc(notifRef, {
    id: notifRef.id,
    type: "friend_request_accepted",
    senderUid: receiver.uid,
    senderUsername: receiver.username,
    senderAvatarUrl: receiver.avatarUrl || "",
    createdAt: Date.now(),
    read: false,
  });
};

// 5. Reject friend request (deletes request, notifies sender)
export const rejectFriendRequest = async (
  sender: { uid: string; username: string; avatarUrl?: string },
  receiver: { uid: string; username: string; avatarUrl?: string }
): Promise<void> => {
  const requestId = `${sender.uid}_${receiver.uid}`;
  const reqRef = doc(fb.firestore, "friendRequests", requestId);
  
  // Delete the request
  await deleteDoc(reqRef);

  // Create notification for sender (A) notifying that receiver (B) declined
  const notifRef = doc(collection(fb.firestore, `users/${sender.uid}/notifications`));
  await setDoc(notifRef, {
    id: notifRef.id,
    type: "friend_request_rejected",
    senderUid: receiver.uid,
    senderUsername: receiver.username,
    senderAvatarUrl: receiver.avatarUrl || "",
    createdAt: Date.now(),
    read: false,
  });
};

// 6. Remove friend (deletes both mutual friendship records)
export const removeFriend = async (currentUserUid: string, friendUid: string): Promise<void> => {
  const friendshipB = doc(fb.firestore, `users/${currentUserUid}/friendships`, friendUid);
  const friendshipA = doc(fb.firestore, `users/${friendUid}/friendships`, currentUserUid);
  
  await deleteDoc(friendshipB);
  await deleteDoc(friendshipA);
};

// Get friends list for a user
export const getFriendsList = async (userUid: string): Promise<Friendship[]> => {
  const snap = await getDocs(collection(fb.firestore, `users/${userUid}/friendships`));
  return snap.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
  })) as Friendship[];
};

// Get sent friend requests for a user
export const getSentFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
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
};

// Get received friend requests for a user
export const getReceivedFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
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
};
