import { DocumentReference } from "firebase/firestore";
import { UserType } from "../users/users-types";

export type FriendRequestStatus = "pending" | "confirmed" | "declined";

type BaseFriendRequest = {
  id: string;
  status: FriendRequestStatus;
  sentAt: number;
};

export type RawFriendRequest = {
  receiverRef: DocumentReference<UserType, UserType>;
  senderRef: DocumentReference<UserType, UserType>;
} & BaseFriendRequest;

export type SentFriendRequest = {
  receiverUser: UserType;
  senderUid: string;
} & BaseFriendRequest;

export type ReceivedFriendRequest = {
  receiverUid: string;
  senderUser: UserType;
} & BaseFriendRequest;
