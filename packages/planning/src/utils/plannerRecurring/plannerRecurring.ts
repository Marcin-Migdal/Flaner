import type {
  BudgetCategory,
  BudgetMonth,
  BudgetPlan,
  BudgetRecurring,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";
import { buildPlannerMonth, type PlannerMonth, type PlannerMonthInput, type PlanRecurring } from "../plannerMonth";
import { daysApart, recurringTransactionIds } from "../recurringTransactions";

/**
 * The Planner's recurring rules (#182): which limits a new month's plan gets from recurring transactions, which
 * recurring transactions still miss a limit in a planned month, and what an unpaid occurrence can be linked to.
 * Expenses only: a limit is an expense target. Pure.
 */

/** A limit recurring transactions add to a month: their expected amount on a category or subcategory without one. */
export type PrefillLimit = {
  categoryId: string;
  category: BudgetCategory;
  /** `null` for the category itself. */
  subcategory: BudgetSubcategory | null;
  amount: number;
};

export type PrefillInput = Pick<PlannerMonthInput, "month" | "accounts" | "categories" | "recurring"> & {
  /** The limits the month starts with (copied from another month, or none). */
  limits: Record<string, number>;
};

/**
 * Prefill: a limit equal to the month's expected recurring wherever a category or subcategory with recurring has no
 * limit of its own in `limits`; an existing limit never changes. In the tree's order.
 */
export const prefillLimits = ({ limits, ...input }: PrefillInput): PrefillLimit[] => {
  const planner = buildPlannerMonth({
    ...input,
    transactions: [],
    plan: { month: input.month, limits, plannedIncome: {} },
  });
  return planner.expenses.outside.flatMap(({ id, category, subcategory, recurringExpected }): PrefillLimit[] =>
    id !== null && category && recurringExpected > 0
      ? [{ categoryId: id, category, subcategory, amount: Math.round(recurringExpected) }]
      : [],
  );
};

/** The plan a month starts with: `base` (a copy or empty) plus the prefill limits. Never a dismissed banner. */
export const startingPlan = (
  month: BudgetMonth,
  base: Pick<BudgetPlan, "limits" | "plannedIncome"> | null,
  prefill: PrefillLimit[],
): BudgetPlan => ({
  month,
  limits: { ...base?.limits, ...Object.fromEntries(prefill.map(({ categoryId, amount }) => [categoryId, amount])) },
  plannedIncome: { ...base?.plannedIncome },
});

/** A recurring transaction due in a planned month on a category or subcategory without a limit of its own. */
export type MissingLimit = {
  planRecurring: PlanRecurring;
  categoryId: string;
  category: BudgetCategory;
  subcategory: BudgetSubcategory | null;
  /** The row's expected recurring (every recurring transaction on it): Create limit's default. */
  amount: number;
};

/**
 * The missing-limit banners of a month: only a planned month (one with a plan) has them, Uncategorized never does,
 * and a banner dismissed in this month's plan stays hidden.
 */
export const missingLimits = (planner: PlannerMonth, plan: BudgetPlan | null): MissingLimit[] => {
  if (!plan) return [];
  const dismissed = new Set(plan.dismissedRecurring ?? []);

  return planner.expenses.outside.flatMap(({ id, category, subcategory, recurring, recurringExpected }) =>
    id === null || !category
      ? []
      : recurring
          .filter((planRecurring) => !dismissed.has(planRecurring.recurring.id))
          .map(
            (planRecurring): MissingLimit => ({
              planRecurring,
              categoryId: id,
              category,
              subcategory,
              amount: Math.round(recurringExpected),
            }),
          ),
  );
};

export type LinkCandidate = {
  transaction: BudgetTransaction;
  /** Already matched to an occurrence of any recurring transaction. */
  matched: boolean;
};

/**
 * What an unpaid occurrence can be linked to by hand: the month's transactions of the recurring transaction's
 * account, direction and category that are not excluded, nearest the due date first; already matched ones are
 * listed but marked.
 */
export const linkCandidates = (
  recurring: BudgetRecurring,
  dueDate: string,
  monthTransactions: BudgetTransaction[],
  allRecurring: BudgetRecurring[],
): LinkCandidate[] => {
  const matchedIds = recurringTransactionIds(allRecurring);
  return monthTransactions
    .filter(
      (transaction) =>
        transaction.accountId === recurring.accountId &&
        transaction.type === recurring.type &&
        transaction.categoryId === recurring.categoryId &&
        !transaction.excluded,
    )
    .map((transaction) => ({ transaction, matched: matchedIds.has(transaction.id) }))
    .sort(
      (a, b) =>
        daysApart(a.transaction.date, dueDate) - daysApart(b.transaction.date, dueDate) ||
        a.transaction.date.localeCompare(b.transaction.date),
    );
};
