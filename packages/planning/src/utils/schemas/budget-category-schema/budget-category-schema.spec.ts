import { describe, expect, it } from "vitest";
import { getBudgetCategorySchema } from "./budget-category-schema";

const schema = getBudgetCategorySchema((key) => key);

describe("budget category schema", () => {
  it("trims the name and accepts a curated icon with a chart colour", () => {
    expect(schema.parse({ name: "  Pets ", icon: "paw-print", color: 5 })).toEqual({
      name: "Pets",
      icon: "paw-print",
      color: 5,
    });
  });

  it("asks for a name of at most 40 characters", () => {
    const issues = (name: string) =>
      schema.safeParse({ name, icon: "tag", color: 1 }).error?.issues.map(({ message }) => message);

    expect(issues(" ")).toEqual(["budget.validation.categoryNameRequired"]);
    expect(issues("x".repeat(41))).toEqual(["budget.validation.categoryNameMax"]);
  });

  it("refuses an icon outside the curated list and a colour outside 1–8", () => {
    expect(schema.safeParse({ name: "Pets", icon: "rocket", color: 1 }).success).toBe(false);
    expect(schema.safeParse({ name: "Pets", icon: "tag", color: 9 }).success).toBe(false);
  });
});
