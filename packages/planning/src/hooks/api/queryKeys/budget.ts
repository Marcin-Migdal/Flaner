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
  /** Prefix of every month's transactions. */
  allTransactions: (uid: string) => ["budget", "transactions", uid],
  /** Ids of the accounts holding at least one transaction (currency locks in Settings). */
  accountsWithTransactions: (uid: string) => ["budget", "accountsWithTransactions", uid],
  /** One account's transaction count (delete confirmation). */
  accountTransactionCount: (uid: string, accountId: string) => ["budget", "accountTransactionCount", uid, accountId],
  /** A published rate (`getExchangeRate`); never changes, so it is never invalidated. */
  exchangeRate: (from: string, to: string, date: string) => ["budget", "exchangeRate", from, to, date],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
  /** Adding or deleting a transaction changes its month only (and which accounts hold transactions). */
  transactionsChanged: ({ uid }: UserType, { date }: { date: string }) => [
    budgetKeys.transactions(uid, monthOfDate(date)),
    budgetKeys.accountsWithTransactions(uid),
  ],
  /** Add, rename, re-currency, hide / show. Hiding is applied by the month ledger from the accounts list. */
  accountsChanged: ({ uid }: UserType) => [budgetKeys.accounts(uid)],
  /** Main account or main currency. */
  profileChanged: ({ uid }: UserType) => [budgetKeys.profile(uid)],
  /** The account's transactions go with it. */
  accountDeleted: ({ uid }: UserType) => [
    budgetKeys.accounts(uid),
    budgetKeys.profile(uid),
    budgetKeys.accountsWithTransactions(uid),
    budgetKeys.allTransactions(uid),
  ],
  // New salt / wrapped keys: a cached copy would no longer unlock
  rewrapKeys: ({ uid }: UserType) => [budgetKeys.locked(uid)],
};
