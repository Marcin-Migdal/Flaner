import type {
  BudgetCategory,
  BudgetCategoryTree,
  BudgetCategoryType,
  BudgetPlan,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";
import { buildMonthLedger, resolveTransactionCategory, type MonthLedgerInput, type MonthTotals } from "../monthLedger";

/**
 * The Planner's view of the month ledger (GLOSSARY → Planner, Limit, Outside the plan, Planned income). Built on
 * `buildMonthLedger`, so it counts exactly the transactions the Transactions month totals count; every counted amount
 * lands once, either in a card or in Outside the plan. Income mirrors expenses: there, "spent" is what was received and
 * the target is the planned income.
 */

/** A subcategory with a target of its own, inside its category's card. */
export type PlanLine = {
  subcategory: BudgetSubcategory;
  spent: number;
  target: number;
  transactions: BudgetTransaction[];
};

/** One category with a target on itself or on any of its subcategories. */
export type PlanCard = {
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

/** Spending (or income) without a target of its own. `id` / `category` `null`: Uncategorized. */
export type OutsideRow = {
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
};

const sumSpent = (transactions: BudgetTransaction[]) => transactions.reduce((sum, { amountMain }) => sum + amountMain, 0);

const buildSide = (
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  targets: Record<string, number>,
  transactions: BudgetTransaction[],
): PlanSide => {
  // Counted transactions of this type by the category / subcategory they sit on; `null` = Uncategorized
  const byCategory = new Map<string | null, BudgetTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    const resolved = resolveTransactionCategory(tree, transaction);
    const key = resolved ? (resolved.subcategory ?? resolved.category).id : null;
    byCategory.set(key, [...(byCategory.get(key) ?? []), transaction]);
  }
  const transactionsOf = (id: string | null) => byCategory.get(id) ?? [];
  const targetOf = (id: string): number | null => targets[id] ?? null;

  const cards: PlanCard[] = [];
  const outside: OutsideRow[] = [];
  const addOutside = (category: BudgetCategory, subcategory: BudgetSubcategory | null) => {
    const id = (subcategory ?? category).id;
    const rowTransactions = transactionsOf(id);
    if (rowTransactions.length > 0) {
      outside.push({ id, category, subcategory, spent: sumSpent(rowTransactions), transactions: rowTransactions });
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
      lines.push({ subcategory, spent: sumSpent(lineTransactions), target: subTarget, transactions: lineTransactions });
    }

    if (target === null && lines.length === 0) continue;
    const cardTransactions = [
      ...(target === null ? [] : transactionsOf(category.id)),
      ...lines.flatMap((line) => line.transactions),
    ];
    cards.push({
      category,
      target,
      limit: target ?? lines.reduce((sum, line) => sum + line.target, 0),
      spent: sumSpent(cardTransactions),
      lines,
      transactions: cardTransactions,
    });
  }

  const uncategorized = transactionsOf(null);
  if (uncategorized.length > 0) {
    outside.push({ id: null, category: null, subcategory: null, spent: sumSpent(uncategorized), transactions: uncategorized });
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

export const buildPlannerMonth = ({ categories, plan, ...ledgerInput }: PlannerMonthInput): PlannerMonth => {
  const { totals, days } = buildMonthLedger(ledgerInput);
  const counted = days.flatMap((day) => day.transactions);

  const expenses = buildSide(categories, "expense", plan?.limits ?? {}, counted);
  const income = buildSide(categories, "income", plan?.plannedIncome ?? {}, counted);
  return { totals, expenses, income, plannedBalance: income.planned - expenses.planned };
};

/** A category or subcategory as the Planner shows it this month: in a card, as a line or outside the plan. */
export type PlannerRow = {
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
    if (line) return { category, subcategory, spent: line.spent, target: line.target, transactions: line.transactions };
    if (card && !subcategory && card.target !== null) {
      return { category, subcategory, spent: card.spent, target: card.target, transactions: card.transactions };
    }
    const row = side.outside.find((candidate) => candidate.id === categoryId);
    return { category, subcategory, spent: row?.spent ?? 0, target: null, transactions: row?.transactions ?? [] };
  }
  return null;
};
