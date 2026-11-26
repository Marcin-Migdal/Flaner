import type {
  BudgetCategory,
  BudgetCategoryRef,
  BudgetCategoryTree,
  BudgetCategoryType,
  BudgetPlan,
  BudgetRule,
  BudgetSplitOff,
  BudgetSubcategory,
  BudgetTransaction,
} from "../../api/budget";

/** What the Edit category dialog changes; a subcategory takes only its `name` (it uses its parent's icon and colour). */
export type BudgetCategoryChanges = Partial<Pick<BudgetCategory, "name" | "icon" | "color">>;

/**
 * The ids a delete removes: the category's own id and, for a main category, its subcategories' ids. Empty when the
 * id is not in the type's tree.
 */
export const categoryIdsOf = (tree: BudgetCategoryTree, { type, categoryId }: BudgetCategoryRef): string[] => {
  for (const category of tree[type]) {
    if (category.id === categoryId) return [category.id, ...category.subcategories.map((sub) => sub.id)];
    if (category.subcategories.some((sub) => sub.id === categoryId)) return [categoryId];
  }
  return [];
};

/** Every category and subcategory id of both trees. */
export const treeCategoryIds = (tree: BudgetCategoryTree): Set<string> =>
  new Set(
    Object.values(tree).flatMap((categories) =>
      categories.flatMap((category) => [category.id, ...category.subcategories.map((sub) => sub.id)]),
    ),
  );

const mapTree = (
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  change: (categories: BudgetCategory[]) => BudgetCategory[],
): BudgetCategoryTree => ({ ...tree, [type]: change(tree[type]) });

/** The tree without the category (with its subcategories) or the subcategory. */
export const removeCategory = (tree: BudgetCategoryTree, { type, categoryId }: BudgetCategoryRef): BudgetCategoryTree =>
  mapTree(tree, type, (categories) =>
    categories
      .filter((category) => category.id !== categoryId)
      .map((category) =>
        category.subcategories.some((sub) => sub.id === categoryId)
          ? { ...category, subcategories: category.subcategories.filter((sub) => sub.id !== categoryId) }
          : category,
      ),
  );

/** Adds a main category at the end of its tree. */
export const addCategory = (
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  category: Omit<BudgetCategory, "subcategories">,
): BudgetCategoryTree => mapTree(tree, type, (categories) => [...categories, { ...category, subcategories: [] }]);

/** Adds a subcategory at the end of its parent's list. */
export const addSubcategory = (
  tree: BudgetCategoryTree,
  { type, categoryId }: BudgetCategoryRef,
  subcategory: BudgetSubcategory,
): BudgetCategoryTree =>
  mapTree(tree, type, (categories) =>
    categories.map((category) =>
      category.id === categoryId ? { ...category, subcategories: [...category.subcategories, subcategory] } : category,
    ),
  );

/** Renames a category or subcategory; a main category also takes a new icon and colour. */
export const updateCategory = (
  tree: BudgetCategoryTree,
  { type, categoryId }: BudgetCategoryRef,
  changes: BudgetCategoryChanges,
): BudgetCategoryTree =>
  mapTree(tree, type, (categories) =>
    categories.map((category) => {
      if (category.id === categoryId) return { ...category, ...changes };
      if (!category.subcategories.some((sub) => sub.id === categoryId) || changes.name === undefined) return category;
      const name = changes.name;
      return {
        ...category,
        subcategories: category.subcategories.map((sub) => (sub.id === categoryId ? { ...sub, name } : sub)),
      };
    }),
  );

const move = <T extends { id: string }>(list: T[], activeId: string, overId: string): T[] => {
  const from = list.findIndex((item) => item.id === activeId);
  const to = list.findIndex((item) => item.id === overId);
  if (from === -1 || to === -1 || from === to) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};

/**
 * Moves a main category (`parentId` `null`) or a subcategory within its parent to the position of `overId`. Moves
 * never cross levels or parents; the same tree when nothing moves.
 */
export const reorderCategories = (
  tree: BudgetCategoryTree,
  type: BudgetCategoryType,
  parentId: string | null,
  activeId: string,
  overId: string,
): BudgetCategoryTree => {
  if (parentId === null) {
    const moved = move(tree[type], activeId, overId);
    return moved === tree[type] ? tree : { ...tree, [type]: moved };
  }
  const parent = tree[type].find((category) => category.id === parentId);
  const moved = parent ? move(parent.subcategories, activeId, overId) : undefined;
  if (!parent || !moved || moved === parent.subcategories) return tree;
  return mapTree(tree, type, (categories) =>
    categories.map((category) => (category.id === parentId ? { ...category, subcategories: moved } : category)),
  );
};

type Categorized = Pick<BudgetTransaction, "categoryId" | "confirmed"> & { splitOffs?: BudgetSplitOff[] };

/**
 * A transaction after a category delete (`deletedIds`): on a deleted category it moves to the replacement (keeping
 * `confirmed`), or without one it reads as Uncategorized and unconfirmed; split-offs on a deleted category move to the
 * replacement or lose their category. The same object when nothing changes.
 */
export const reassignTransaction = <T extends Categorized>(
  transaction: T,
  deletedIds: ReadonlySet<string>,
  replacementId: string | null,
): T => {
  const isDeleted = (id: string | null) => id !== null && deletedIds.has(id);
  const ownMoves = isDeleted(transaction.categoryId);
  const splitOffMoves = transaction.splitOffs?.some((splitOff) => isDeleted(splitOff.categoryId)) ?? false;
  if (!ownMoves && !splitOffMoves) return transaction;

  return {
    ...transaction,
    ...(ownMoves && { categoryId: replacementId, confirmed: replacementId !== null && transaction.confirmed }),
    ...(splitOffMoves && {
      splitOffs: transaction.splitOffs?.map((splitOff) =>
        isDeleted(splitOff.categoryId) ? { ...splitOff, categoryId: replacementId } : splitOff,
      ),
    }),
  };
};

/** Whether the transaction or one of its split-offs is on one of the categories. */
export const usesCategory = (transaction: Categorized, ids: ReadonlySet<string>): boolean =>
  (transaction.categoryId !== null && ids.has(transaction.categoryId)) ||
  (transaction.splitOffs ?? []).some((splitOff) => splitOff.categoryId !== null && ids.has(splitOff.categoryId));

/** Rules after a category delete: repointed to the replacement, or deleted without one. Same array when unchanged. */
export const reassignRules = (
  rules: BudgetRule[],
  deletedIds: ReadonlySet<string>,
  replacementId: string | null,
): BudgetRule[] => {
  if (!rules.some((rule) => deletedIds.has(rule.categoryId))) return rules;
  if (replacementId === null) return rules.filter((rule) => !deletedIds.has(rule.categoryId));
  return rules.map((rule) => (deletedIds.has(rule.categoryId) ? { ...rule, categoryId: replacementId } : rule));
};

const keepKnown = (amounts: Record<string, number>, known: ReadonlySet<string>) =>
  Object.fromEntries(Object.entries(amounts).filter(([categoryId]) => known.has(categoryId)));

/** The plan without limits and planned income of categories no longer in the tree (dropped on the plan's next save). */
export const pruneDeletedCategories = <P extends Pick<BudgetPlan, "limits" | "plannedIncome">>(
  plan: P,
  tree: BudgetCategoryTree,
): P => {
  const known = treeCategoryIds(tree);
  return { ...plan, limits: keepKnown(plan.limits, known), plannedIncome: keepKnown(plan.plannedIncome, known) };
};
