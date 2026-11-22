import type { UserType } from "@flaner/shared/types";

// Budget query keys — the only place that builds them. All fetched (no listeners).
// - `all`: prefix of every budget key (Reset budget drops them).
// - `locked`: the user's stored keys (`budget_keys/{uid}`), read by the Budget gate to pick onboarding or unlock.
export const budgetKeys = {
  all: ["budget"],
  locked: (uid: string) => ["budget", "locked", uid],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
  // New salt / wrapped keys: a cached copy would no longer unlock
  rewrapKeys: ({ uid }: UserType) => [budgetKeys.locked(uid)],
};
