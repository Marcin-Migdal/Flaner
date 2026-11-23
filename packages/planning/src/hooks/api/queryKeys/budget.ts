import type { UserType } from "@flaner/shared/types";
import type { BudgetMonth } from "../../../api/budget";
import { monthOfDate } from "../../../utils/monthLedger";

// Budget query keys — the only place that builds them. All fetched (no listeners).
// - `all`: prefix of every budget key (Reset budget drops them).
// - `locked`: the user's stored keys (`budget_keys/{uid}`), read by the Budget gate to pick onboarding or unlock.
// - `profile` / `categories` / `accounts`: decrypted per-user documents, read behind the gate.
// - `transactions`: the decrypted transactions of all the user's accounts in one month (one month-range query).
export const budgetKeys = {
  all: ["budget"],
  locked: (uid: string) => ["budget", "locked", uid],
  profile: (uid: string) => ["budget", "profile", uid],
  categories: (uid: string) => ["budget", "categories", uid],
  accounts: (uid: string) => ["budget", "accounts", uid],
  transactions: (uid: string, month: BudgetMonth) => ["budget", "transactions", uid, month],
  /** A published rate (`getExchangeRate`); never changes, so it is never invalidated. */
  exchangeRate: (from: string, to: string, date: string) => ["budget", "exchangeRate", from, to, date],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
  /** Adding or deleting a transaction changes its month only. */
  transactionsChanged: ({ uid }: UserType, { date }: { date: string }) => [budgetKeys.transactions(uid, monthOfDate(date))],
  /** An import changes every month it adds to. */
  transactionsImported: ({ uid }: UserType, inputs: { date: string }[]) =>
    [...new Set(inputs.map(({ date }) => monthOfDate(date)))].map((month) => budgetKeys.transactions(uid, month)),
  // New salt / wrapped keys: a cached copy would no longer unlock
  rewrapKeys: ({ uid }: UserType) => [budgetKeys.locked(uid)],
};
