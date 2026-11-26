import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import * as budgetApi from "../../../../api/budget";
import type { BudgetCategoryTree, UnlockedBudget } from "../../../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../../../context/BudgetContext";
import { BudgetCategoriesSection } from "./BudgetCategoriesSection";

vi.mock("../../../../api/budget", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../api/budget")>()),
  getBudgetCategories: vi.fn(),
  updateBudgetCategories: vi.fn(),
  countBudgetCategoryTransactions: vi.fn(),
  deleteBudgetCategory: vi.fn(),
}));

const i18n = createTestI18n({ en: { planning: en } });

let budget: UnlockedBudget;
beforeAll(async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  budget = { uid: "user-1", keyId: "key-1", userKey };
});

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "shopping",
      name: "Shopping",
      icon: "shopping-bag",
      color: 1,
      subcategories: [
        { id: "groceries", name: "Groceries" },
        { id: "clothes", name: "Clothes" },
      ],
    },
    { id: "home", name: "Home", icon: "house", color: 2, subcategories: [] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

/** The tree the last `updateBudgetCategories` call saved (its change applied to `categories`). */
const savedTree = () => {
  const [, change] = vi.mocked(budgetApi.updateBudgetCategories).mock.calls.at(-1) ?? [];
  return change?.(categories);
};

// jsdom has no layout: each sortable row gets a 40px slot by its position, so keyboard moves find their neighbour
const layOutRows = () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const row = this.closest("li");
    const index = row?.parentElement ? [...row.parentElement.children].indexOf(row) : 0;
    return DOMRect.fromRect({ x: 0, y: index * 40, width: 300, height: 40 });
  });
};

// Stands in for the Budget gate: the section renders once the budget is unlocked
const Unlocked = ({ children }: { children: ReactNode }) => {
  const { budget: unlocked, setBudget } = useBudgetSession();
  useEffect(() => setBudget(budget), [setBudget]);
  return unlocked ? children : null;
};

const renderSection = async () => {
  renderWithProviders(
    <BudgetProvider>
      <Unlocked>
        <BudgetCategoriesSection />
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  await screen.findByRole("heading", { name: "Expense categories" });
  return userEvent.setup();
};

describe("BudgetCategoriesSection", () => {
  beforeEach(() => {
    vi.mocked(budgetApi.getBudgetCategories).mockResolvedValue(categories);
    vi.mocked(budgetApi.updateBudgetCategories).mockImplementation(async (_budget, change) => change(categories));
    vi.mocked(budgetApi.countBudgetCategoryTransactions).mockResolvedValue(3);
    vi.mocked(budgetApi.deleteBudgetCategory).mockResolvedValue(categories);
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows the expense and income trees; a category expands to its subcategories", async () => {
    const events = await renderSection();

    const expense = screen.getByRole("region", { name: "Expense categories" });
    expect(within(expense).getByText("Shopping")).toBeInTheDocument();
    expect(within(expense).getByText("2 subcategories")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Income categories" })).getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();

    await events.click(screen.getByRole("button", { name: "Show subcategories of Shopping" }));

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide subcategories of Shopping" })).toHaveAttribute("aria-expanded", "true");
  });

  it("reorders categories by keyboard on the drag handle", async () => {
    layOutRows();
    const events = await renderSection();

    screen.getByRole("button", { name: "Move Home" }).focus();
    await events.keyboard(" ");
    await events.keyboard("{ArrowUp}");
    await events.keyboard(" ");

    await waitFor(() => expect(budgetApi.updateBudgetCategories).toHaveBeenCalled());
    expect(savedTree()?.expense.map(({ id }) => id)).toEqual(["home", "shopping"]);
  });

  it("adds a main category with an icon and colour, and a subcategory by name only", async () => {
    const events = await renderSection();

    const income = screen.getByRole("region", { name: "Income categories" });
    await events.click(within(income).getByRole("button", { name: "Add category" }));
    let dialog = screen.getByRole("dialog", { name: "Add category" });
    await events.type(within(dialog).getByLabelText("Name"), "Bonus");
    await events.click(within(dialog).getByRole("radio", { name: "Gift" }));
    await events.click(within(dialog).getByRole("radio", { name: "Colour 5" }));
    await events.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(savedTree()?.income[1]).toEqual({
      id: expect.any(String),
      name: "Bonus",
      icon: "gift",
      color: 5,
      subcategories: [],
    });

    await events.click(screen.getByRole("button", { name: "Show subcategories of Home" }));
    await events.click(screen.getByRole("button", { name: "Add subcategory" }));
    dialog = screen.getByRole("dialog", { name: "Add subcategory to Home" });
    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    await events.type(within(dialog).getByLabelText("Name"), "Rent");
    await events.click(within(dialog).getByRole("button", { name: "Add" }));

    await waitFor(() => expect(savedTree()?.expense[1].subcategories).toEqual([{ id: expect.any(String), name: "Rent" }]));
  });

  it("renames a category", async () => {
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Actions for Home" }));
    await events.click(screen.getByRole("menuitem", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit category" });
    const name = within(dialog).getByLabelText("Name");
    await events.clear(name);
    await events.type(name, "Flat");
    await events.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(savedTree()?.expense[1]).toMatchObject({ name: "Flat", icon: "house", color: 2 }));
  });

  it("deletes a category after showing its usage, moving its transactions to a replacement", async () => {
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Actions for Shopping" }));
    await events.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Shopping?" });

    expect(await within(dialog).findByText("Its 2 subcategories are deleted with it. 3 transactions use it.")).toBeInTheDocument();
    expect(budgetApi.countBudgetCategoryTransactions).toHaveBeenCalledWith(budget, ["shopping", "groceries", "clothes"]);

    // Same type only, never the deleted category or its subcategories
    await events.click(within(dialog).getByLabelText("Move their transactions to"));
    expect(screen.queryByRole("option", { name: "Groceries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Salary" })).not.toBeInTheDocument();
    await events.click(screen.getByRole("option", { name: "Home" }));
    await events.click(within(dialog).getByRole("button", { name: "Yes, delete" }));

    await waitFor(() =>
      expect(budgetApi.deleteBudgetCategory).toHaveBeenCalledWith(budget, {
        type: "expense",
        categoryId: "shopping",
        replacementId: "home",
      }),
    );
  });

  it("deletes a subcategory without a replacement", async () => {
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Show subcategories of Shopping" }));
    await events.click(screen.getByRole("button", { name: "Actions for Clothes" }));
    await events.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Clothes?" });
    expect(await within(dialog).findByText("3 transactions use it.")).toBeInTheDocument();
    expect(within(dialog).getByText("Don't move · they become Uncategorized")).toBeInTheDocument();
    await events.click(within(dialog).getByRole("button", { name: "Yes, delete" }));

    await waitFor(() =>
      expect(budgetApi.deleteBudgetCategory).toHaveBeenCalledWith(budget, {
        type: "expense",
        categoryId: "clothes",
        replacementId: null,
      }),
    );
  });
});
