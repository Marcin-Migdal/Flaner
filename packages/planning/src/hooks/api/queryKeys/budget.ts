import type { UserType } from "@flaner/shared/types";
import type { BudgetMonth } from "../../../api/budget";

// Budget query keys — the only place that builds them. All fetched (no listeners).
// - `locked`: the user's stored keys (`budget_keys/{uid}`), read by the Budget gate to pick onboarding or unlock.
// - `profile` / `categories` / `accounts`: decrypted per-user documents, read behind the gate.
// - `transactions`: the decrypted transactions of all the user's accounts in one month (one month-range query).
export const budgetKeys = {
  locked: (uid: string) => ["budget", "locked", uid],
  profile: (uid: string) => ["budget", "profile", uid],
  categories: (uid: string) => ["budget", "categories", uid],
  accounts: (uid: string) => ["budget", "accounts", uid],
  transactions: (uid: string, month: BudgetMonth) => ["budget", "transactions", uid, month],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
  /** Adding or deleting a transaction changes its month only. */
  transactionsChanged: ({ uid }: UserType, { date }: { date: string }) => [budgetKeys.transactions(uid, date.slice(0, 7))],
};
