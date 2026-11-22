import type { UserType } from "@flaner/shared/types";

// Budget query keys — the only place that builds them. All fetched (no listeners).
// - `locked`: the user's stored keys (`budget_keys/{uid}`), read by the Budget gate to pick onboarding or unlock.
export const budgetKeys = {
  locked: (uid: string) => ["budget", "locked", uid],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
};
