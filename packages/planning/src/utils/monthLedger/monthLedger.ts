import type {
  BudgetAccount,
  BudgetCategory,
  BudgetCategoryTree,
  BudgetMonth,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";

/**
 * The month ledger: every counting rule of a Budget month, shared by Transactions, the Planner and Summary so
 * their numbers are identical. Pure — takes decrypted transactions, returns numbers in the main currency.
 *
 * Counted: transactions dated in the month, not excluded, on accounts that are not hidden; their `amountMain`.
 */

export type MonthTotals = {
  income: number;
  expenses: number;
  /** `income - expenses`. */
  balance: number;
};

export type LedgerDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Income minus expenses of the day. */
  net: number;
  /** The day's rows, the one added last first. */
  transactions: BudgetTransaction[];
};

export type MonthLedger = {
  totals: MonthTotals;
  /** Days with counted transactions, newest first. */
  days: LedgerDay[];
};

export type MonthLedgerInput = {
  month: BudgetMonth;
  /** May hold other months' transactions; only the month's are counted. */
  transactions: BudgetTransaction[];
  accounts: BudgetAccount[];
};

/** The month a `YYYY-MM-DD` date falls in. */
export const monthOfDate = (date: string): BudgetMonth => date.slice(0, 7);

/** An amount with its direction: positive for income, negative for an expense (never `-0`, which formats as "-0.00"). */
export const signedAmount = (type: BudgetTransaction["type"], amount: number) => (type === "income" ? amount : 0 - amount);

const hiddenAccountIdsOf = (accounts: BudgetAccount[]) =>
  new Set(accounts.filter((account) => account.hidden).map((account) => account.id));

const isCounted = (transaction: BudgetTransaction, hiddenAccountIds: Set<string>) =>
  !transaction.excluded && !hiddenAccountIds.has(transaction.accountId);

/**
 * Rows grouped by day, newest day first; within a day the one added last comes first. Every given row is listed
 * (e.g. excluded ones the Relevance filter shows), but a day's net counts only what the ledger counts.
 */
export const groupTransactionsByDay = (transactions: BudgetTransaction[], accounts: BudgetAccount[]): LedgerDay[] => {
  const hiddenAccountIds = hiddenAccountIdsOf(accounts);
  const daysByDate = new Map<string, LedgerDay>();

  // Walk backwards, so within a day the transaction added last comes first
  for (const transaction of [...transactions].reverse()) {
    const day = daysByDate.get(transaction.date) ?? { date: transaction.date, net: 0, transactions: [] };
    if (isCounted(transaction, hiddenAccountIds)) day.net += signedAmount(transaction.type, transaction.amountMain);
    day.transactions.push(transaction);
    daysByDate.set(transaction.date, day);
  }

  return [...daysByDate.values()].sort((a, b) => b.date.localeCompare(a.date));
};

export const buildMonthLedger = ({ month, transactions, accounts }: MonthLedgerInput): MonthLedger => {
  const hiddenAccountIds = hiddenAccountIdsOf(accounts);
  const counted = transactions.filter(
    (transaction) => monthOfDate(transaction.date) === month && isCounted(transaction, hiddenAccountIds),
  );

  const totals: MonthTotals = { income: 0, expenses: 0, balance: 0 };
  for (const transaction of counted) {
    if (transaction.type === "income") totals.income += transaction.amountMain;
    else totals.expenses += transaction.amountMain;
  }
  totals.balance = totals.income - totals.expenses;

  return { totals, days: groupTransactionsByDay(counted, accounts) };
};

export type ResolvedCategory = {
  category: BudgetCategory;
  /** `null` when the transaction sits on the main category itself. */
  subcategory: BudgetSubcategory | null;
};

/**
 * The category (and subcategory) a transaction is classified by, looked up in its type's tree.
 * `null` means Uncategorized: no category, or one that is no longer in that tree.
 */
export const resolveTransactionCategory = (
  tree: BudgetCategoryTree,
  { type, categoryId }: Pick<BudgetTransaction, "type" | "categoryId">,
): ResolvedCategory | null => {
  if (!categoryId) return null;

  for (const category of tree[type]) {
    if (category.id === categoryId) return { category, subcategory: null };
    const subcategory = category.subcategories.find((sub) => sub.id === categoryId);
    if (subcategory) return { category, subcategory };
  }
  return null;
};
