import { addMonths, endOfMonth, format, getDaysInMonth, parseISO } from "date-fns";
import type {
  BudgetAccount,
  BudgetCategory,
  BudgetCategoryTree,
  BudgetMonth,
  BudgetRecurring,
  BudgetRecurringMatch,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";
import { buildMonthLedger, monthOfDate, resolveTransactionCategory, type MonthLedger, type MonthTotals } from "../monthLedger";
import type { PlannerMonth } from "../plannerMonth";
import { expectedAmount, recurringOccurrences, type OccurrenceStatus } from "../recurringTransactions";
import { UNCATEGORIZED_FILTER } from "../transactionFilters";

/**
 * Summary's view of the month ledger (GLOSSARY → Summary): the spending donut, the 12-month bars, month-over-month
 * change, plan progress, the to-review count and this month's recurring occurrences. Pure, built on
 * `buildMonthLedger` / `buildPlannerMonth`, so Summary's numbers match Transactions and the Planner.
 */

/** The donut shows this many categories; the rest fold into Others. */
export const SUMMARY_TOP_CATEGORIES = 7;
/** Months in the income vs expenses bars, ending on the chosen month. */
export const SUMMARY_BAR_MONTHS = 12;

/** Spending on a subcategory, or on the main category itself (`subcategory: null`). */
export type SpendingPart = { id: string; subcategory: BudgetSubcategory | null; amount: number };

export type SpendingCategory = {
  /** The main category's id, or `UNCATEGORIZED_FILTER` for spending without a (known) category. */
  id: string;
  /** `null`: Uncategorized. */
  category: BudgetCategory | null;
  amount: number;
  /** Largest first; empty for Uncategorized. */
  parts: SpendingPart[];
};

export type SpendingBreakdown = {
  /** All counted expenses (the month's expenses total). */
  total: number;
  /** The largest categories, at most `SUMMARY_TOP_CATEGORIES`. */
  top: SpendingCategory[];
  /** The rest, largest first; empty when there is no Others. */
  others: SpendingCategory[];
  othersAmount: number;
};

const byAmount = <T extends { amount: number }>(a: T, b: T) => b.amount - a.amount;

/**
 * Expenses by main category, ranked (ties keep the tree's order, Uncategorized after the tree). Takes the ledger's
 * `entries`, so split-offs count under their own category. Beyond the top `SUMMARY_TOP_CATEGORIES`, the rest fold
 * into Others.
 */
export const buildSpendingBreakdown = (entries: BudgetTransaction[], tree: BudgetCategoryTree): SpendingBreakdown => {
  const amounts = new Map<string, number>();
  let uncategorized = 0;
  let total = 0;
  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    total += entry.amountMain;
    const resolved = resolveTransactionCategory(tree, entry);
    if (!resolved) {
      uncategorized += entry.amountMain;
      continue;
    }
    const id = (resolved.subcategory ?? resolved.category).id;
    amounts.set(id, (amounts.get(id) ?? 0) + entry.amountMain);
  }

  const categories: SpendingCategory[] = tree.expense.flatMap((category) => {
    const parts = [
      { id: category.id, subcategory: null, amount: amounts.get(category.id) ?? 0 },
      ...category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        subcategory,
        amount: amounts.get(subcategory.id) ?? 0,
      })),
    ]
      .filter((part) => part.amount > 0)
      .sort(byAmount);
    const amount = parts.reduce((sum, part) => sum + part.amount, 0);
    return amount > 0 ? [{ id: category.id, category, amount, parts }] : [];
  });
  if (uncategorized > 0) categories.push({ id: UNCATEGORIZED_FILTER, category: null, amount: uncategorized, parts: [] });

  // `sort` is stable, so equal amounts keep the tree's order
  const ranked = categories.sort(byAmount);
  const top = ranked.slice(0, SUMMARY_TOP_CATEGORIES);
  const others = ranked.slice(SUMMARY_TOP_CATEGORIES);
  return { total, top, others, othersAmount: others.reduce((sum, item) => sum + item.amount, 0) };
};

/** The month `count` months after (negative: before) `month`. */
export const shiftMonth = (month: BudgetMonth, count: number): BudgetMonth =>
  format(addMonths(parseISO(`${month}-01`), count), "yyyy-MM");

/** The `count` months ending on `month`, oldest first. */
export const monthsEndingOn = (month: BudgetMonth, count: number): BudgetMonth[] =>
  Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1));

export type MonthlyTotals = { month: BudgetMonth; totals: MonthTotals };

/** Month ledger totals of each month in `months` (e.g. the 12 bars), in the given order. */
export const buildMonthlyTotals = ({
  months,
  transactions,
  accounts,
}: {
  months: BudgetMonth[];
  transactions: BudgetTransaction[];
  accounts: BudgetAccount[];
}): MonthlyTotals[] =>
  months.map((month) => ({ month, totals: buildMonthLedger({ month, transactions, accounts }).totals }));

/** `current` minus `previous`, per total. */
export const totalsChange = (current: MonthTotals, previous: MonthTotals): MonthTotals => ({
  income: current.income - previous.income,
  expenses: current.expenses - previous.expenses,
  balance: current.balance - previous.balance,
});

/** Days of `month` from `today` to its end, today included: all of a future month's, none of a past one's. */
export const daysLeftInMonth = (month: BudgetMonth, today: string): number => {
  const todayMonth = monthOfDate(today);
  if (month < todayMonth) return 0;
  const days = getDaysInMonth(parseISO(`${month}-01`));
  return month > todayMonth ? days : days - Number(today.slice(8, 10)) + 1;
};

/** One limit of the plan: a category card's own limit, or a subcategory line's. */
export type LimitProgress = {
  id: string;
  category: BudgetCategory;
  subcategory: BudgetSubcategory | null;
  spent: number;
  limit: number;
  exceeded: boolean;
};

export type PlanProgress = {
  /** All of the month's expenses (the Planner header's Spent). */
  spent: number;
  /** Sum of the limits (the Planner header's Limit). */
  limit: number;
  /** In the plan's order: each card's own limit, then its lines'. */
  limits: LimitProgress[];
  daysLeft: number;
};

const limitProgress = (
  category: BudgetCategory,
  subcategory: BudgetSubcategory | null,
  spent: number,
  limit: number,
): LimitProgress => ({ id: (subcategory ?? category).id, category, subcategory, spent, limit, exceeded: spent > limit });

/** The Plan card: the month's expenses against the sum of limits (as the Planner header), then each limit. */
export const buildPlanProgress = (planner: PlannerMonth, month: BudgetMonth, today: string): PlanProgress => {
  const { cards, spent, planned } = planner.expenses;
  return {
    spent,
    limit: planned,
    limits: cards.flatMap((card) => [
      ...(card.target === null ? [] : [limitProgress(card.category, null, card.spent, card.target)]),
      ...card.lines.map((line) => limitProgress(card.category, line.subcategory, line.spent, line.target)),
    ]),
    daysLeft: daysLeftInMonth(month, today),
  };
};

export type ToReviewCount = {
  unconfirmed: number;
  /** Without a (known) category, on the transaction or on a split-off that is not excluded. */
  uncategorized: number;
  /** Transactions that are either (one that is both counts once). */
  total: number;
};

/** Counted transactions of the month that still need a look: unconfirmed or uncategorized. */
export const countToReview = (ledger: MonthLedger, tree: BudgetCategoryTree): ToReviewCount => {
  const isUncategorized = (transaction: BudgetTransaction) =>
    [transaction, ...(transaction.splitOffs ?? []).filter((splitOff) => !splitOff.excluded)].some(
      ({ categoryId }) => !resolveTransactionCategory(tree, { type: transaction.type, categoryId }),
    );
  const count = { unconfirmed: 0, uncategorized: 0, total: 0 };
  for (const transaction of ledger.days.flatMap((day) => day.transactions)) {
    const unconfirmed = !transaction.confirmed;
    const uncategorized = isUncategorized(transaction);
    if (unconfirmed) count.unconfirmed += 1;
    if (uncategorized) count.uncategorized += 1;
    if (unconfirmed || uncategorized) count.total += 1;
  }
  return count;
};

export type RecurringMonthOccurrence = {
  recurring: BudgetRecurring;
  dueDate: string;
  status: OccurrenceStatus;
  /** The matched transaction's amount when paid, else the expected amount (main currency). */
  amountMain: number;
  match?: BudgetRecurringMatch;
};

export type RecurringMonth = {
  /** By due date, then payee. */
  occurrences: RecurringMonthOccurrence[];
  /** Paid (or received) occurrences. */
  done: number;
  /** Still expected: income minus expenses of the occurrences not paid yet. */
  stillExpected: number;
};

/** The month's occurrences of the recurring transactions on accounts that are not hidden ("N of M done"). */
export const summarizeRecurringMonth = ({
  recurring,
  accounts,
  month,
  today,
}: {
  recurring: BudgetRecurring[];
  accounts: BudgetAccount[];
  month: BudgetMonth;
  today: string;
}): RecurringMonth => {
  const hidden = new Set(accounts.filter((account) => account.hidden).map((account) => account.id));
  const range = { from: `${month}-01`, to: format(endOfMonth(parseISO(`${month}-01`)), "yyyy-MM-dd") };

  const occurrences = recurring
    .filter((item) => !hidden.has(item.accountId))
    .flatMap((item) => {
      const expected = expectedAmount(item).amountMain;
      return recurringOccurrences(item, range, today).map(
        ({ dueDate, status, match }): RecurringMonthOccurrence => ({
          recurring: item,
          dueDate,
          status,
          amountMain: match ? match.amountMain : expected,
          match,
        }),
      );
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.recurring.payee.localeCompare(b.recurring.payee));

  const pending = occurrences.filter((occurrence) => occurrence.status !== "paid");
  return {
    occurrences,
    done: occurrences.length - pending.length,
    stillExpected: pending.reduce(
      (sum, { recurring: item, amountMain }) => sum + (item.type === "income" ? amountMain : -amountMain),
      0,
    ),
  };
};
