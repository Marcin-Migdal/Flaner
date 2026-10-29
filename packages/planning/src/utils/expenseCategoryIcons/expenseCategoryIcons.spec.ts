import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORY_ICONS } from "./expenseCategoryIcons";
import { EXPENSE_CATEGORIES } from "../../api/splits/types";

describe("EXPENSE_CATEGORY_ICONS", () => {
  it("provides an icon for every ExpenseCategory", () => {
    EXPENSE_CATEGORIES.forEach((category) => {
      expect(EXPENSE_CATEGORY_ICONS[category]).toBeDefined();
    });
  });
});
