export type LanguageType = 'pl' | 'en';

export type UserType = {
  avatarUrl: string;
  language: LanguageType;
  username: string;
  usernameLower: string;
  darkMode: boolean;
  uid: string;
  email: string;
};

export type EditUserRequest = {
  currentUserUid: string | undefined;
  darkMode?: boolean;
  language?: LanguageType;
  username?: string;
  usernameLower?: string;
  avatarUrl?: string;
};

export type SearchedUserType = UserType & { invited: boolean; isFriend: boolean };

export type Friendships = {
  userRef: any; // Using any for DocumentReference to decouple from direct firestore dependency in types if needed, or we can use DocumentReference
  username: string;
  usernameLower: string;
  createdAt: number;
};
