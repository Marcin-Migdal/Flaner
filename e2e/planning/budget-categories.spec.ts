import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetSettingsPage } from "../support/pages/BudgetSettings.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const GROCERIES = /groceries|spożywcze/i;
// Not a default category name, so the replacement picker has one match
const NEW_CATEGORY = "Aquarium";

test.describe("Budget categories", () => {
  test("a category is added, reordered by keyboard, and a deleted subcategory moves its transactions and rules to the replacement", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);
    const settings = new BudgetSettingsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Cash" });
    await transactions.addExpense({ amount: "20", payee: "Bakery Central" });
    await expect(transactions.addDialog).toBeHidden();
    // Groceries on the list: also teaches a rule for the payee
    await transactions.setRowCategory("Bakery Central", "Groceries");
    await expect(transactions.row("Bakery Central").getByText(GROCERIES)).toBeVisible();

    await settings.openFromNav();
    await settings.openTab(/^(categories|kategorie)$/i);
    await expect(page).toHaveURL(/#categories$/);

    // A new category lands last
    await settings.addExpenseCategory({ name: NEW_CATEGORY, icon: /^(paw print|łapa)$/i, color: 4 });
    await expect.poll(async () => (await settings.expenseCategoryOrder()).at(-1)).toBe(NEW_CATEGORY);

    // Keyboard reorder: one place up
    const before = await settings.expenseCategoryOrder();
    await settings.moveExpenseCategoryUpByKeyboard(NEW_CATEGORY, { from: before.length, total: before.length });
    await expect.poll(() => settings.expenseCategoryOrder()).toEqual([...before.slice(0, -2), NEW_CATEGORY, before.at(-2)]);

    // Delete Groceries: the dialog counts its transaction; its replacement is the new category
    await settings.expandExpenseCategory(/shopping|zakupy/);
    const dialog = await settings.openDeleteCategory(GROCERIES);
    await expect(dialog).toContainText(/1 transaction uses it|używa jej 1 transakcja/i);
    await settings.confirmDeleteCategory(dialog, NEW_CATEGORY);
    await expect(settings.expenseCategories.getByText(GROCERIES)).toHaveCount(0);

    // Its rule now points at the replacement
    await settings.openTab(/^(rules|reguły)$/i);
    await expect(settings.tabPanel.getByText(NEW_CATEGORY, { exact: true })).toBeVisible();

    // And so does its transaction, still confirmed
    await transactions.openFromNav();
    await expect(transactions.row("Bakery Central").getByText(NEW_CATEGORY)).toBeVisible();
    await expect(transactions.confirmCategoryButton("Bakery Central")).toHaveCount(0);
  });
});
