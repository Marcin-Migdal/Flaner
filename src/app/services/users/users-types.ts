import { DocumentReference } from "firebase/firestore";

export type LanguageType = "en" | "pl";

//! USERS
export type UserType = {
    avatarUrl: string;
    language: LanguageType;
    username: string;
    darkMode: boolean;
    uid: string;
    email: string;
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
}

export type UserNotification = {
    type: NotificationType;
    createdAt: number;
};
