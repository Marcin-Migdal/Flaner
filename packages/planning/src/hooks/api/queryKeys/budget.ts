import type { UserType } from "@flaner/shared/types";
import type { BudgetMonth } from "../../../api/budget";
import { monthOfDate } from "../../../utils/monthLedger";

// Budget query keys — the only place that builds them. All fetched (no listeners).
// - `all`: prefix of every budget key (Reset budget drops them).
// - `locked`: the user's stored keys (`budget_keys/{uid}`), read by the Budget gate to pick onboarding or unlock.
// - `profile` / `categories` / `accounts`: decrypted per-user documents, read behind the gate.
// - `transactions`: the decrypted transactions of all the user's accounts in one month (one month-range query).
// - `rules`: the decrypted categorization rules (`budget_rules/{uid}`); every write that sets a category can teach one.
// - `plan`: the decrypted plan of one month (`budget_plans/{uid}_{month}`), `null` while the month has none.
// - `recurring`: every recurring transaction of the user's accounts with its matches (`budget_recurring`).
export const budgetKeys = {
  all: ["budget"],
  locked: (uid: string) => ["budget", "locked", uid],
  profile: (uid: string) => ["budget", "profile", uid],
  categories: (uid: string) => ["budget", "categories", uid],
  rules: (uid: string) => ["budget", "rules", uid],
  accounts: (uid: string) => ["budget", "accounts", uid],
  /** Prefix of every month's transactions. */
  allTransactions: (uid: string) => ["budget", "transactions", uid],
  transactions: (uid: string, month: BudgetMonth) => [...budgetKeys.allTransactions(uid), month],
  /** Transactions of the months `from`..`to` (refund candidates); under `allTransactions`, so writes reach it. */
  transactionsRange: (uid: string, from: BudgetMonth, to: BudgetMonth) => [
    ...budgetKeys.allTransactions(uid),
    "range",
    from,
    to,
  ],
  /** Ids of the accounts holding at least one transaction (currency locks); stale with the accounts. */
  accountsWithTransactions: (uid: string) => [...budgetKeys.accounts(uid), "withTransactions"],
  /** One account's transaction count (delete confirmation). */
  accountTransactionCount: (uid: string, accountId: string) => ["budget", "accountTransactionCount", uid, accountId],
  plan: (uid: string, month: BudgetMonth) => ["budget", "plan", uid, month],
  /** How many transactions use the categories (delete confirmation). */
  categoryTransactionCount: (uid: string, categoryIds: string[]) => [
    "budget",
    "categoryTransactionCount",
    uid,
    categoryIds.join(","),
  ],
  recurring: (uid: string) => ["budget", "recurring", uid],
  /** A published rate (`getExchangeRate`); never changes, so it is never invalidated. */
  exchangeRate: (from: string, to: string, date: string) => ["budget", "exchangeRate", from, to, date],
};

/** Which keys each budget write makes stale. */
export const budgetInvalidation = {
  createBudget: ({ uid }: UserType) => [budgetKeys.locked(uid)],
  // Every transaction write below also re-matches the recurring transactions
  /** Adding or deleting a transaction changes its month only (and which accounts hold transactions). */
  transactionsChanged: ({ uid }: UserType, { date }: { date: string }) => [
    budgetKeys.transactions(uid, monthOfDate(date)),
    budgetKeys.accountsWithTransactions(uid),
    budgetKeys.recurring(uid),
  ],
  /** A manual entry with a category also teaches a rule. */
  transactionAdded: (user: UserType, input: { date: string }) => [
    ...budgetInvalidation.transactionsChanged(user, input),
    budgetKeys.rules(user.uid),
  ],
  /** Edits and bulk deletes change every month a transaction left or moved to. */
  transactionsInMonths: ({ uid }: UserType, dates: string[]) => [
    ...[...new Set(dates.map(monthOfDate))].map((month) => budgetKeys.transactions(uid, month)),
    budgetKeys.accountsWithTransactions(uid),
    budgetKeys.recurring(uid),
  ],
  /**
   * Deletes, split-offs and refund links: a linked refund on the other side may sit in any month and account, so
   * every loaded month is refetched.
   */
  linkedTransactionsChanged: ({ uid }: UserType) => [
    budgetKeys.allTransactions(uid),
    budgetKeys.accountsWithTransactions(uid),
    budgetKeys.recurring(uid),
  ],
  /** Edits also teach a rule when they set or change a category. */
  transactionsEdited: (user: UserType, dates: string[]) => [
    ...budgetInvalidation.transactionsInMonths(user, dates),
    budgetKeys.rules(user.uid),
  ],
  /** An import changes every month it adds to, and teaches from the rows changed in the preview. */
  transactionsImported: ({ uid }: UserType, inputs: { date: string }[]) => [
    ...[...new Set(inputs.map(({ date }) => monthOfDate(date)))].map((month) => budgetKeys.transactions(uid, month)),
    budgetKeys.accountsWithTransactions(uid),
    budgetKeys.rules(uid),
    budgetKeys.recurring(uid),
  ],
  /** Settings → Rules: edit or delete a rule. */
  rulesChanged: ({ uid }: UserType) => [budgetKeys.rules(uid)],
  /** Add, rename, re-currency, hide / show. Hiding is applied by the month ledger from the accounts list. */
  accountsChanged: ({ uid }: UserType) => [budgetKeys.accounts(uid)],
  /** Main account or main currency. */
  profileChanged: ({ uid }: UserType) => [budgetKeys.profile(uid)],
  /** The account's transactions go with it. */
  accountDeleted: ({ uid }: UserType) => [
    budgetKeys.accounts(uid),
    budgetKeys.profile(uid),
    budgetKeys.allTransactions(uid),
    budgetKeys.recurring(uid),
  ],
  /**
   * A deleted category moves (or uncategorizes) transactions in any month and account, recurring transactions and
   * rules. Tree edits need nothing: the mutation stores the saved tree in the cache.
   */
  categoryDeleted: ({ uid }: UserType) => [
    budgetKeys.categories(uid),
    budgetKeys.rules(uid),
    budgetKeys.allTransactions(uid),
    budgetKeys.recurring(uid),
  ],
  /** Make recurring, edit rule, stop, delete: only the recurring list changes. */
  recurringChanged: ({ uid }: UserType) => [budgetKeys.recurring(uid)],
  /** A limit or planned income changes its month's plan only. */
  planChanged: ({ uid }: UserType, { month }: { month: BudgetMonth }) => [budgetKeys.plan(uid, month)],
  // New salt / wrapped keys: a cached copy would no longer unlock
  rewrapKeys: ({ uid }: UserType) => [budgetKeys.locked(uid)],
};
