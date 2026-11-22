import { describe, expect, it } from "vitest";
import { createTestI18n } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import pl from "../../../public/locales/pl/planning.json";
import { buildDefaultCategoryTree } from "./defaultBudgetCategories";

const i18n = createTestI18n({ en: { planning: en }, pl: { planning: pl } });

describe("buildDefaultCategoryTree", () => {
  it("seeds 12 expense categories with subcategories and 10 flat income categories", () => {
    const tree = buildDefaultCategoryTree(i18n.getFixedT("en", "planning"));

    expect(tree.expense).toHaveLength(12);
    expect(tree.income).toHaveLength(10);
    expect(tree.expense[0]).toMatchObject({ name: "Shopping", icon: "shopping-bag", color: 8 });
    expect(tree.expense[0].subcategories.map((sub) => sub.name)).toEqual([
      "Groceries",
      "Newspapers & magazines",
      "Household chemicals",
      "Hobbies",
      "Clothing & footwear",
      "Electronics",
      "Alcohol",
      "Other shopping",
    ]);
    expect(tree.expense.at(-1)).toMatchObject({ name: "Savings", icon: "piggy-bank", color: 3, subcategories: [] });
    expect(tree.income.every((category) => category.subcategories.length === 0)).toBe(true);
    expect(tree.income[0]).toMatchObject({ name: "Salary", icon: "wallet", color: 3 });
  });

  it("writes the names in the given UI language", () => {
    const tree = buildDefaultCategoryTree(i18n.getFixedT("pl", "planning"));

    expect(tree.expense[0].name).toBe("Zakupy");
    expect(tree.expense[0].subcategories[0].name).toBe("Spożywcze");
    expect(tree.income.at(-1)?.name).toBe("Inne przychody");
  });

  it("gives every category and subcategory its own id", () => {
    const tree = buildDefaultCategoryTree(i18n.getFixedT("en", "planning"));

    const ids = [...tree.expense, ...tree.income].flatMap((category) => [
      category.id,
      ...category.subcategories.map((sub) => sub.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
