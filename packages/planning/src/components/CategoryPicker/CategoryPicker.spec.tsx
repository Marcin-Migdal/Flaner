import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { BudgetCategoryTree } from "../../api/budget";
import { CategoryPicker } from "./CategoryPicker";

const i18n = createTestI18n({
  en: {
    planning: {
      budget: {
        categoryPicker: {
          placeholder: "Choose a category",
          noResults: "No categories",
          confirm: "Confirm category {{category}}",
          suggested: "Rule suggestion",
        },
      },
    },
  },
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
  it("marks the rule's suggestion in the list", async () => {
    const user = userEvent.setup();
    renderPicker({ suggestedId: "fuel" });

    await user.click(screen.getByLabelText("Category"));

    expect(screen.getByRole("option", { name: /Fuel/ })).toHaveTextContent("Rule suggestion");
    expect(screen.getByRole("option", { name: "Groceries" })).not.toHaveTextContent("Rule suggestion");
  });

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

  describe("inline", () => {
    const renderInline = (props: Partial<Parameters<typeof CategoryPicker>[0]> = {}) => {
      const onChange = vi.fn();
      const onConfirm = vi.fn();
      renderWithProviders(
        <CategoryPicker
          tree={tree}
          type="expense"
          value="fuel"
          onChange={onChange}
          onConfirm={onConfirm}
          variant="inline"
          aria-label="Category of Orlen"
          {...props}
        />,
        { i18nInstance: i18n },
      );
      return { onChange, onConfirm };
    };

    it("marks an unconfirmed category with ? and confirms it on an icon click", async () => {
      const user = userEvent.setup();
      const { onConfirm, onChange } = renderInline({ confirmed: false });

      expect(screen.getByText("?")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Confirm category Fuel" }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("shows no ? and nothing to confirm on a confirmed category or Uncategorized", () => {
      renderInline({ confirmed: true });
      expect(screen.queryByText("?")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Confirm category/ })).not.toBeInTheDocument();
    });

    it("opens the searchable list on a click on the name", async () => {
      const user = userEvent.setup();
      const { onChange, onConfirm } = renderInline({ confirmed: false });

      await user.click(screen.getByText("Car / Fuel"));
      await user.type(screen.getByLabelText("Category of Orlen"), "groc");
      await user.click(screen.getByRole("option", { name: "Groceries" }));

      expect(onChange).toHaveBeenCalledWith("groceries");
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
