export type UserShares = {
  userId: string;
  sharedCategories: string[];
  sharedProducts: string[];
  sharedLists: string[];
  receivedCategories: string[];
  receivedProducts: string[];
  receivedLists: string[];
};

export type FirestoreUserShares = Omit<UserShares, "userId">;
