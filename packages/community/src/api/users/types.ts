import type { DocumentReference } from "firebase/firestore";

export type FriendRequest = {
  id: string;
  senderUid: string;
  receiverUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  receiverUsername: string;
  receiverAvatarUrl: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

/** Stored doc `users/{me}/friendships/{friendUid}`: no profile copy, the profile is read live (#26) */
export type FriendshipDoc = {
  userRef: DocumentReference;
  createdAt: number;
};

export type Friendship = {
  uid: string;
  createdAt: number;
};
