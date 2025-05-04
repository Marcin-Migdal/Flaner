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

export type AccessType = {
  ownerId: string;
  editAccess: string[];
  viewAccess: string[];
};

export type AuditType = {
  createdAt: string;
  updatedAt: string;
};
