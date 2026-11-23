import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { BudgetCategoryTree } from "../../api/budget";
import { CategoryPicker } from "./CategoryPicker";

const i18n = createTestI18n({
  en: { planning: { budget: { categoryPicker: { placeholder: "Choose a category", noResults: "No categories" } } } },
});

const tree: BudgetCategoryTree = {
  expense: [
    {
      id: "shopping",
      name: "Shopping",
      icon: "shopping-bag",
      color: 1,
      subcategories: [
        { id: "groceries", name: "Groceries" },
        { id: "clothing", name: "Clothing" },
      ],
    },
    { id: "car", name: "Car", icon: "car", color: 2, subcategories: [{ id: "fuel", name: "Fuel" }] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const renderPicker = (props: Partial<Parameters<typeof CategoryPicker>[0]> = {}) => {
  const onChange = vi.fn();
  renderWithProviders(
    <CategoryPicker tree={tree} type="expense" value={null} onChange={onChange} label="Category" {...props} />,
    { i18nInstance: i18n },
  );
  return { onChange };
};

describe("CategoryPicker", () => {
  it("offers only the given type's categories and subcategories", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByLabelText("Category"));

    for (const name of ["Shopping", "Groceries", "Clothing", "Car", "Fuel"]) {
      expect(screen.getByRole("option", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("option", { name: "Salary" })).not.toBeInTheDocument();
  });

  it("searches names, a category's name also finding its subcategories", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.type(screen.getByLabelText("Category"), "shop");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Shopping",
      "Groceries",
      "Clothing",
    ]);

    await user.click(screen.getByRole("option", { name: "Groceries" }));
    expect(onChange).toHaveBeenCalledWith("groceries");
  });

  it("shows the chosen subcategory with its category", () => {
    renderPicker({ value: "fuel" });

    expect(screen.getByText("Car / Fuel")).toBeInTheDocument();
  });

  it("shows the placeholder for no category or an unknown one", () => {
    renderPicker({ value: "deleted" });

    expect(screen.getByText("Choose a category")).toBeInTheDocument();
  });
});
