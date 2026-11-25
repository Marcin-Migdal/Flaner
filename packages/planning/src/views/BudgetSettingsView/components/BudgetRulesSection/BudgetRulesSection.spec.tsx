import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import * as budgetApi from "../../../../api/budget";
import type { BudgetCategoryTree, BudgetRule, UnlockedBudget } from "../../../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../../../context/BudgetContext";
import { BudgetRulesSection } from "./BudgetRulesSection";

vi.mock("../../../../api/budget", () => ({
  getBudgetCategories: vi.fn(),
  getBudgetRules: vi.fn(),
  editBudgetRule: vi.fn(),
  deleteBudgetRule: vi.fn(),
}));

const i18n = createTestI18n({ en: { planning: en } });

let budget: UnlockedBudget;
beforeAll(async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  budget = { uid: "user-1", keyId: "key-1", userKey };
});

const categories: BudgetCategoryTree = {
  expense: [
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: 1, subcategories: [{ id: "groceries", name: "Groceries" }] },
    { id: "home", name: "Home", icon: "house", color: 2, subcategories: [] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const rules: BudgetRule[] = [
  { kind: "keyword", key: "biedronka warszawa", type: "expense", categoryId: "groceries" },
  { kind: "accountNumber", key: "61109010140000071219812874", type: "expense", categoryId: "home", payee: "Landlord" },
  { kind: "keyword", key: "acme", type: "income", categoryId: "salary" },
];

const setUp = (stored: BudgetRule[] = rules) => {
  vi.mocked(budgetApi.getBudgetCategories).mockResolvedValue(categories);
  vi.mocked(budgetApi.getBudgetRules).mockResolvedValue(stored);
  vi.mocked(budgetApi.editBudgetRule).mockResolvedValue([]);
  vi.mocked(budgetApi.deleteBudgetRule).mockResolvedValue([]);
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
        <BudgetRulesSection />
      </Unlocked>
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  await screen.findByRole("heading", { name: "Categorization rules" });
  return userEvent.setup();
};

describe("BudgetRulesSection", () => {
  beforeEach(() => setUp());
  afterEach(() => vi.clearAllMocks());

  it("lists each rule's counterparty, how it is recognized and its category; account numbers are masked", async () => {
    await renderSection();

    const [acme, keyword, landlord] = screen.getAllByRole("listitem");
    expect(within(acme).getByDisplayValue("acme")).toBeInTheDocument();
    expect(within(acme).getByText("Income")).toBeInTheDocument();
    expect(within(keyword).getByDisplayValue("biedronka warszawa")).toBeInTheDocument();
    expect(within(keyword).getByText("Keyword")).toBeInTheDocument();
    expect(within(keyword).getByText("Shopping / Groceries")).toBeInTheDocument();
    expect(within(landlord).getByText("Landlord")).toBeInTheDocument();
    expect(within(landlord).getByText("Account number")).toBeInTheDocument();
    expect(within(landlord).getByText("•••• 2874")).toBeInTheDocument();
    expect(screen.queryByText(/61109010140000071219812874/)).not.toBeInTheDocument();
  });

  it("searches by counterparty and category", async () => {
    const events = await renderSection();

    await events.type(screen.getByRole("searchbox", { name: "Search rules" }), "home");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Landlord")).toBeInTheDocument();

    await events.clear(screen.getByRole("searchbox", { name: "Search rules" }));
    await events.type(screen.getByRole("searchbox", { name: "Search rules" }), "lidl");
    expect(screen.getByText("No matching rules")).toBeInTheDocument();
  });

  it("shortens a keyword in place, rejecting anything that is not a part of it", async () => {
    const events = await renderSection();
    const field = screen.getByRole("textbox", { name: "Keyword biedronka warszawa" });

    await events.clear(field);
    await events.type(field, "lidl{Enter}");
    expect(budgetApi.editBudgetRule).not.toHaveBeenCalled();
    expect(field).toHaveValue("biedronka warszawa");

    await events.clear(field);
    await events.type(field, "Biedronka{Enter}");
    await waitFor(() =>
      expect(budgetApi.editBudgetRule).toHaveBeenCalledWith(budget, "keyword:expense:biedronka warszawa", {
        key: "biedronka",
      }),
    );
  });

  it("changes a rule's category and deletes a rule", async () => {
    const events = await renderSection();

    await events.type(screen.getByLabelText("Category for Landlord"), "Shop");
    await events.click(screen.getByRole("option", { name: "Shopping" }));
    await events.click(screen.getByRole("button", { name: "Delete the rule for acme" }));

    await waitFor(() => expect(budgetApi.deleteBudgetRule).toHaveBeenCalledWith(budget, "keyword:income:acme"));
    expect(budgetApi.editBudgetRule).toHaveBeenCalledWith(budget, "accountNumber:expense:61109010140000071219812874", {
      categoryId: "shopping",
    });
  });

  it("explains how rules appear while there are none", async () => {
    setUp([]);
    await renderSection();

    expect(screen.getByText("No rules yet")).toBeInTheDocument();
  });
});
