import type {
  BudgetCategory,
  BudgetCategoryTree,
  BudgetCategoryType,
  BudgetPlan,
  BudgetRecurring,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";
import { buildMonthLedger, resolveTransactionCategory, type MonthLedgerInput, type MonthTotals } from "../monthLedger";
import { expectedAmount, monthOccurrences, type RecurringOccurrence } from "../recurringTransactions";

/**
 * The Planner's view of the month ledger (GLOSSARY → Planner, Limit, Outside the plan, Planned income). Built on
 * `buildMonthLedger`, so it counts exactly the transactions the Transactions month totals count; every counted amount
 * lands once, either in a card or in Outside the plan. Income mirrors expenses: there, "spent" is what was received and
 * the target is the planned income.
 *
 * Recurring transactions (#182) sit on the row of their category the same way: a row's `recurringPaid` /
 * `recurringExpected` cover the recurring transactions whose spending that row counts, and a category or subcategory
 * with recurring but no target of its own lands in Outside the plan even without spending.
 */

/** A recurring transaction due this month on a Planner row, with its occurrences of the month. */
export type PlanRecurring = {
  recurring: BudgetRecurring;
  /** Newest first. */
  occurrences: RecurringOccurrence[];
  /** Paid occurrences at their matched amount. */
  paid: number;
  /** The month's total: paid occurrences at their amount, the rest at the expected amount. */
  expected: number;
};

/** What every Planner row adds to its amounts: the recurring transactions it counts. */
type RowRecurring = {
  recurring: PlanRecurring[];
  recurringPaid: number;
  recurringExpected: number;
};

/** A subcategory with a target of its own, inside its category's card. */
export type PlanLine = RowRecurring & {
  subcategory: BudgetSubcategory;
  spent: number;
  target: number;
  transactions: BudgetTransaction[];
};

/** One category with a target on itself or on any of its subcategories. */
export type PlanCard = RowRecurring & {
  category: BudgetCategory;
  /** The category's own target; `null` when only subcategories have one. */
  target: number | null;
  /** The category's own target, else the sum of its lines' targets. */
  limit: number;
  /** The category's own transactions (only when it has a target) plus its lines'. */
  spent: number;
  lines: PlanLine[];
  transactions: BudgetTransaction[];
};

/** Spending, income or recurring without a target of its own. `id` / `category` `null`: Uncategorized. */
export type OutsideRow = RowRecurring & {
  id: string | null;
  category: BudgetCategory | null;
  /** `null` for the category itself. */
  subcategory: BudgetSubcategory | null;
  spent: number;
  transactions: BudgetTransaction[];
};

export type PlanSide = {
  cards: PlanCard[];
  /** In the tree's order, Uncategorized last. */
  outside: OutsideRow[];
  /** Everything counted of this type (equals the month total). */
  spent: number;
  outsideSpent: number;
  /** Sum of the cards' limits. */
  planned: number;
};

export type PlannerMonth = {
  totals: MonthTotals;
  expenses: PlanSide;
  income: PlanSide;
  /** Planned income minus planned expenses. */
  plannedBalance: number;
};

export type PlannerMonthInput = MonthLedgerInput & {
  categories: BudgetCategoryTree;
  /** `null`: the month has no plan yet. */
  plan: BudgetPlan | null;
  /** Recurring transactions of the user's accounts and today's day (occurrence status); none when left out. */
  recurring?: { list: BudgetRecurring[]; today: string };
};

const sumSpent = (transactions: BudgetTransaction[]) => transactions.reduce((sum, { amountMain }) => sum + amountMain, 0);

const rowRecurring = (recurring: PlanRecurring[]): RowRecurring => ({
  recurring,
  recurringPaid: recurring.reduce((sum, { paid }) => sum + paid, 0),
  recurringExpected: recurring.reduce((sum, { expected }) => sum + expected, 0),
});

/** The recurring transactions due in `month` on accounts that are not hidden, with their month's amounts. */
const planRecurringOf = ({ month, accounts, recurring }: PlannerMonthInput): PlanRecurring[] => {
  if (!recurring) return [];
  const hiddenAccountIds = new Set(accounts.filter((account) => account.hidden).map((account) => account.id));

  return recurring.list.flatMap((item): PlanRecurring[] => {
    if (hiddenAccountIds.has(item.accountId)) return [];
    const occurrences = monthOccurrences(item, month, recurring.today);
    if (occurrences.length === 0) return [];
    const expectedNext = expectedAmount(item).amountMain;
    const paid = occurrences.reduce((sum, { match }) => sum + (match?.amountMain ?? 0), 0);
    const unpaid = occurrences.filter(({ match }) => !match).length;
    return [{ recurring: item, occurrences, paid, expected: paid + unpaid * expectedNext }];
  });
};

/** Groups by the category / subcategory id the item sits on in `type`'s tree; `null` = Uncategorized. */
const groupByCategory = <T extends Pick<BudgetTransaction, "type" | "categoryId">>(
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  items: T[],
) => {
  const byCategory = new Map<string | null, T[]>();
  for (const item of items) {
    if (item.type !== type) continue;
    const resolved = resolveTransactionCategory(tree, item);
    const key = resolved ? (resolved.subcategory ?? resolved.category).id : null;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }
  return (id: string | null) => byCategory.get(id) ?? [];
};

const buildSide = (
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  targets: Record<string, number>,
  transactions: BudgetTransaction[],
  planRecurring: PlanRecurring[],
): PlanSide => {
  // Counted transactions (and recurring transactions) of this type by the category / subcategory they sit on
  const transactionsOf = groupByCategory(tree, type, transactions);
  const byRecurring = groupByCategory(
    tree,
    type,
    planRecurring.map((item) => ({ type: item.recurring.type, categoryId: item.recurring.categoryId, item })),
  );
  const recurringOf = (id: string | null) => byRecurring(id).map(({ item }) => item);
  const targetOf = (id: string): number | null => targets[id] ?? null;

  const cards: PlanCard[] = [];
  const outside: OutsideRow[] = [];
  const addOutside = (category: BudgetCategory, subcategory: BudgetSubcategory | null) => {
    const id = (subcategory ?? category).id;
    const rowTransactions = transactionsOf(id);
    const rowRecurringItems = recurringOf(id);
    if (rowTransactions.length > 0 || rowRecurringItems.length > 0) {
      outside.push({
        id,
        category,
        subcategory,
        spent: sumSpent(rowTransactions),
        transactions: rowTransactions,
        ...rowRecurring(rowRecurringItems),
      });
    }
  };

  for (const category of tree[type]) {
    const target = targetOf(category.id);
    const lines: PlanLine[] = [];

    if (target === null) addOutside(category, null);
    for (const subcategory of category.subcategories) {
      const subTarget = targetOf(subcategory.id);
      if (subTarget === null) {
        addOutside(category, subcategory);
        continue;
      }
      const lineTransactions = transactionsOf(subcategory.id);
      lines.push({
        subcategory,
        spent: sumSpent(lineTransactions),
        target: subTarget,
        transactions: lineTransactions,
        ...rowRecurring(recurringOf(subcategory.id)),
      });
    }

    if (target === null && lines.length === 0) continue;
    const cardTransactions = [
      ...(target === null ? [] : transactionsOf(category.id)),
      ...lines.flatMap((line) => line.transactions),
    ];
    const cardRecurring = [...(target === null ? [] : recurringOf(category.id)), ...lines.flatMap((line) => line.recurring)];
    cards.push({
      category,
      target,
      limit: target ?? lines.reduce((sum, line) => sum + line.target, 0),
      spent: sumSpent(cardTransactions),
      lines,
      transactions: cardTransactions,
      ...rowRecurring(cardRecurring),
    });
  }

  const uncategorized = transactionsOf(null);
  const uncategorizedRecurring = recurringOf(null);
  if (uncategorized.length > 0 || uncategorizedRecurring.length > 0) {
    outside.push({
      id: null,
      category: null,
      subcategory: null,
      spent: sumSpent(uncategorized),
      transactions: uncategorized,
      ...rowRecurring(uncategorizedRecurring),
    });
  }

  const outsideSpent = outside.reduce((sum, row) => sum + row.spent, 0);
  return {
    cards,
    outside,
    spent: cards.reduce((sum, card) => sum + card.spent, 0) + outsideSpent,
    outsideSpent,
    planned: cards.reduce((sum, card) => sum + card.limit, 0),
  };
};

export const buildPlannerMonth = (input: PlannerMonthInput): PlannerMonth => {
  const { categories, plan } = input;
  // Split-offs count under their own category, the transaction's rest under its category
  const { totals, entries: counted } = buildMonthLedger(input);
  const planRecurring = planRecurringOf(input);

  const expenses = buildSide(categories, "expense", plan?.limits ?? {}, counted, planRecurring);
  const income = buildSide(categories, "income", plan?.plannedIncome ?? {}, counted, planRecurring);
  return { totals, expenses, income, plannedBalance: income.planned - expenses.planned };
};

/** A category or subcategory as the Planner shows it this month: in a card, as a line or outside the plan. */
export type PlannerRow = RowRecurring & {
  category: BudgetCategory;
  /** `null` for the category itself. */
  subcategory: BudgetSubcategory | null;
  /** Counted against `target` in a card or line; the row's own amount outside the plan. */
  spent: number;
  /** Its own limit / planned income. */
  target: number | null;
  transactions: BudgetTransaction[];
};

/** The row of a category or subcategory of `type`'s tree; `null` when the id is not in that tree. */
export const findPlannerRow = (
  planner: PlannerMonth,
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  categoryId: string,
): PlannerRow | null => {
  const side = type === "expense" ? planner.expenses : planner.income;
  for (const category of tree[type]) {
    const subcategory = category.subcategories.find((sub) => sub.id === categoryId) ?? null;
    if (category.id !== categoryId && !subcategory) continue;

    const card = side.cards.find((candidate) => candidate.category.id === category.id);
    const line = card?.lines.find((candidate) => candidate.subcategory.id === categoryId);
    const toRow = (
      { spent, transactions, recurring }: Pick<PlannerRow, "spent" | "transactions" | "recurring">,
      target: number | null,
    ): PlannerRow => ({ category, subcategory, spent, target, transactions, ...rowRecurring(recurring) });
    if (line) return toRow(line, line.target);
    if (card && !subcategory && card.target !== null) return toRow(card, card.target);
    const row = side.outside.find((candidate) => candidate.id === categoryId);
    return toRow(row ?? { spent: 0, transactions: [], recurring: [] }, null);
  }
  return null;
};
