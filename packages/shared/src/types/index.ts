export type LanguageType = "pl" | "en";

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

export * from "./navigation";
export * from "./api";

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
