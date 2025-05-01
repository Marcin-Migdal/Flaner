import { DocumentReference } from "firebase/firestore";

import { LanguageType } from "@i18n";

//! USERS
export type UserType = {
  avatarUrl: string;
  language: LanguageType;
  username: string;
  darkMode: boolean;
  uid: string;
  email: string;
  themeColorHue: number;
};

export type EditUserRequest = {
  currentUserUid: string | undefined;
  themeColorHue?: number;
  darkMode?: boolean;
  language?: LanguageType;
  username?: string;
  avatarUrl?: string;
};

//! SEARCH USERS
export type SearchedUserType = UserType & { invited: boolean; isFriend: boolean };

//! FRIEND REQUESTS
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

//! FRIENDSHIPS
export type Friendships = {
  userRef: DocumentReference<UserType, UserType>;
  username: string;
  createdAt: number;
};

//! NOTIFICATIONS
export enum NotificationType {
  FRIEND_REQUEST_ACCEPT = "friend-request-accepted",
  OTHER = "other",
}

export type RawNotification =
  | {
      type: NotificationType.FRIEND_REQUEST_ACCEPT;
      createdAt: number;
      content: string;
      read: boolean;
      userRef: DocumentReference<UserType, UserType>;
    }
  | {
      type: NotificationType.OTHER;
      createdAt: number;
      content: string;
      read: boolean;
    };

export type Notification = {
  id: string;
  type: NotificationType;
  createdAt: number;
  content: string;
  read: boolean;
  receivedFrom?: {
    avatarUrl: string;
    uid: string;
    name: string;
  };
};
