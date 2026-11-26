import { describe, expect, it } from "vitest";
import type { BudgetCategoryTree, BudgetRule, BudgetSplitOff } from "../../api/budget";
import {
  addCategory,
  addSubcategory,
  categoryIdsOf,
  pruneDeletedCategories,
  reassignRules,
  reassignTransaction,
  removeCategory,
  reorderCategories,
  updateCategory,
  usesCategory,
} from "./categoryTree";

const tree: BudgetCategoryTree = {
  expense: [
    {
      id: "food",
      name: "Food",
      icon: "utensils",
      color: 1,
      subcategories: [
        { id: "groceries", name: "Groceries" },
        { id: "restaurants", name: "Restaurants" },
      ],
    },
    { id: "car", name: "Car", icon: "car", color: 2, subcategories: [{ id: "fuel", name: "Fuel" }] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const splitOff = (categoryId: string | null): BudgetSplitOff => ({
  id: `s-${categoryId}`,
  amount: 100,
  categoryId,
  note: "",
  excluded: false,
});

describe("categoryIdsOf", () => {
  it("gives a main category with its subcategories, or a subcategory alone", () => {
    expect(categoryIdsOf(tree, { type: "expense", categoryId: "food" })).toEqual(["food", "groceries", "restaurants"]);
    expect(categoryIdsOf(tree, { type: "expense", categoryId: "fuel" })).toEqual(["fuel"]);
  });

  it("is empty for an id of the other type or a missing id", () => {
    expect(categoryIdsOf(tree, { type: "income", categoryId: "food" })).toEqual([]);
    expect(categoryIdsOf(tree, { type: "expense", categoryId: "nope" })).toEqual([]);
  });
});

describe("tree edits", () => {
  it("removes a main category with its subcategories, or one subcategory", () => {
    expect(removeCategory(tree, { type: "expense", categoryId: "food" }).expense.map(({ id }) => id)).toEqual(["car"]);
    const withoutFuel = removeCategory(tree, { type: "expense", categoryId: "fuel" });
    expect(withoutFuel.expense[1].subcategories).toEqual([]);
    expect(withoutFuel.income).toBe(tree.income);
  });

  it("adds a category at the end, and a subcategory at the end of its parent", () => {
    const added = addCategory(tree, "income", { id: "bonus", name: "Bonus", icon: "gift", color: 5 });
    expect(added.income[1]).toEqual({ id: "bonus", name: "Bonus", icon: "gift", color: 5, subcategories: [] });

    const sub = addSubcategory(tree, { type: "expense", categoryId: "car" }, { id: "parking", name: "Parking" });
    expect(sub.expense[1].subcategories.map(({ id }) => id)).toEqual(["fuel", "parking"]);
  });

  it("renames and restyles a main category, and only renames a subcategory", () => {
    const main = updateCategory(tree, { type: "expense", categoryId: "car" }, { name: "Auto", icon: "bus", color: 7 });
    expect(main.expense[1]).toMatchObject({ name: "Auto", icon: "bus", color: 7 });

    const sub = updateCategory(tree, { type: "expense", categoryId: "fuel" }, { name: "Petrol", icon: "bus" });
    expect(sub.expense[1]).toMatchObject({ icon: "car", subcategories: [{ id: "fuel", name: "Petrol" }] });
  });

  it("reorders main categories and subcategories within their parent", () => {
    expect(reorderCategories(tree, "expense", null, "car", "food").expense.map(({ id }) => id)).toEqual(["car", "food"]);
    const subs = reorderCategories(tree, "expense", "food", "restaurants", "groceries").expense[0].subcategories;
    expect(subs.map(({ id }) => id)).toEqual(["restaurants", "groceries"]);
  });

  it("keeps the same tree when nothing moves or the move crosses parents", () => {
    expect(reorderCategories(tree, "expense", null, "car", "car")).toBe(tree);
    expect(reorderCategories(tree, "expense", "food", "fuel", "groceries")).toBe(tree);
  });
});

describe("reassignTransaction", () => {
  const deleted = new Set(["food", "groceries", "restaurants"]);

  it("moves the transaction and its split-offs to the replacement, keeping confirmed", () => {
    const transaction = { categoryId: "groceries", confirmed: true, splitOffs: [splitOff("restaurants"), splitOff("fuel")] };
    expect(reassignTransaction(transaction, deleted, "car")).toEqual({
      categoryId: "car",
      confirmed: true,
      splitOffs: [{ ...splitOff("restaurants"), categoryId: "car" }, splitOff("fuel")],
    });
  });

  it("without a replacement leaves it Uncategorized and unconfirmed", () => {
    expect(reassignTransaction({ categoryId: "food", confirmed: true }, deleted, null)).toEqual({
      categoryId: null,
      confirmed: false,
    });
  });

  it("moves only split-offs when the transaction's own category stays", () => {
    const transaction = { categoryId: "fuel", confirmed: true, splitOffs: [splitOff("food")] };
    expect(reassignTransaction(transaction, deleted, null)).toEqual({
      categoryId: "fuel",
      confirmed: true,
      splitOffs: [{ ...splitOff("food"), categoryId: null }],
    });
  });

  it("returns the same object when nothing uses the deleted categories", () => {
    const transaction = { categoryId: "fuel", confirmed: false, splitOffs: [splitOff(null)] };
    expect(reassignTransaction(transaction, deleted, "car")).toBe(transaction);
  });
});

describe("usesCategory", () => {
  it("counts the transaction's own category and its split-offs'", () => {
    const ids = new Set(["food"]);
    expect(usesCategory({ categoryId: "food", confirmed: true }, ids)).toBe(true);
    expect(usesCategory({ categoryId: null, confirmed: true, splitOffs: [splitOff("food")] }, ids)).toBe(true);
    expect(usesCategory({ categoryId: "car", confirmed: true }, ids)).toBe(false);
  });
});

describe("reassignRules", () => {
  const rules: BudgetRule[] = [
    { kind: "keyword", key: "biedronka", type: "expense", categoryId: "groceries" },
    { kind: "keyword", key: "orlen", type: "expense", categoryId: "fuel" },
  ];
  const deleted = new Set(["groceries"]);

  it("repoints rules to the replacement", () => {
    expect(reassignRules(rules, deleted, "food")[0].categoryId).toBe("food");
  });

  it("deletes rules without a replacement", () => {
    expect(reassignRules(rules, deleted, null)).toEqual([rules[1]]);
  });

  it("keeps the same array when no rule points at a deleted category", () => {
    expect(reassignRules(rules, new Set(["car"]), null)).toBe(rules);
  });
});

describe("pruneDeletedCategories", () => {
  it("drops limits and planned income of categories no longer in the tree", () => {
    const plan = { month: "2026-11", limits: { food: 100, gone: 50 }, plannedIncome: { salary: 900, old: 1 } };
    expect(pruneDeletedCategories(plan, tree)).toEqual({
      month: "2026-11",
      limits: { food: 100 },
      plannedIncome: { salary: 900 },
    });
  });
});
