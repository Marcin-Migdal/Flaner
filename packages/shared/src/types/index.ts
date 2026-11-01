export type LanguageType = "pl" | "en";

/** Public profile stored in `users/{uid}`, readable by every signed-in user — never put private data here. */
export type UserProfile = {
  avatarUrl: string;
  language: LanguageType;
  username: string;
  usernameLower: string;
  darkMode: boolean;
  uid: string;
};

/** The signed-in user: their profile plus private data that only Firebase Auth holds. */
export type UserType = UserProfile & {
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

export type SearchedUserType = UserProfile & { invited: boolean; isFriend: boolean };

export * from "./navigation";
export * from "./api";
export * from "./money";

import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      successMessageKey?: string;
      errorMessageKey?: string;
    };
    queryMeta: {
      errorMessageKey?: string;
    };
  }
}
