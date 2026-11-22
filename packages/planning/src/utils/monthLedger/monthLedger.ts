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

const signed = (transaction: BudgetTransaction) =>
  transaction.type === "income" ? transaction.amountMain : -transaction.amountMain;

export const buildMonthLedger = ({ month, transactions, accounts }: MonthLedgerInput): MonthLedger => {
  const hiddenAccountIds = new Set(accounts.filter((account) => account.hidden).map((account) => account.id));
  const counted = transactions.filter(
    (transaction) =>
      transaction.date.startsWith(`${month}-`) && !transaction.excluded && !hiddenAccountIds.has(transaction.accountId),
  );

  const totals: MonthTotals = { income: 0, expenses: 0, balance: 0 };
  const daysByDate = new Map<string, LedgerDay>();

  // Walk backwards, so within a day the transaction added last comes first
  for (const transaction of [...counted].reverse()) {
    if (transaction.type === "income") totals.income += transaction.amountMain;
    else totals.expenses += transaction.amountMain;

    const day = daysByDate.get(transaction.date) ?? { date: transaction.date, net: 0, transactions: [] };
    day.net += signed(transaction);
    day.transactions.push(transaction);
    daysByDate.set(transaction.date, day);
  }
  totals.balance = totals.income - totals.expenses;

  const days = [...daysByDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  return { totals, days };
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
