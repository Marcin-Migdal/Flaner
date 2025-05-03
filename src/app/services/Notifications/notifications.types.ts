import { DocumentReference } from "firebase/firestore";
import { UserType } from "../users";

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

export enum NotificationType {
  FRIEND_REQUEST_ACCEPT = "friend-request-accepted",
  OTHER = "other",
}
