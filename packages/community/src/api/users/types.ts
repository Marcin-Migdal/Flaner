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

export type Friendship = {
  userRef: DocumentReference;
  username: string;
  usernameLower: string;
  avatarUrl?: string;
  createdAt: number;
  uid: string;
};
