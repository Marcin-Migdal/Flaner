import { DocumentReference } from "firebase/firestore";

import { LanguageType } from "@i18n";

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

export type SearchedUserType = UserType & { invited: boolean; isFriend: boolean };

export type Friendships = {
  userRef: DocumentReference<UserType, UserType>;
  username: string;
  createdAt: number;
};
