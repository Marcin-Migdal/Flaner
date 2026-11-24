import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { listDocumentIds, readDocument } from "../support/helpers/emulator";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetSettingsPage } from "../support/pages/BudgetSettings.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
// Unbreakable, at the 60-character limit
const LONG_NAME = "Savings-account-at-the-cooperative-bank-of-central-Mazovia";
const MAKE_MAIN = /^(make main|ustaw jako główne)$/i;

test.describe("Budget accounts", () => {
  test("accounts are listed main first, made main, hidden from the list and deleted with their transactions", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const settings = new BudgetSettingsPage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Wallet" });
    await expect(transactions.emptyStateTitle).toBeVisible();
    // In-app navigation keeps the budget unlocked (a reload would ask for the passphrase)
    const open = (view: "settings" | "transactions") => page.locator(`a[href="/planning/budget/${view}"]`).first().click();
    await open("settings");
    await settings.addAccount("Zeta");
    await settings.addAccount("alpha");
    await settings.addAccount(LONG_NAME);

    // Main first, then alphabetical
    await expect(settings.accountRows).toHaveCount(4);
    await expect(settings.accountRows.nth(0)).toContainText("Wallet");
    await expect(settings.accountRows.nth(1)).toContainText("alpha");
    await expect(settings.accountRows.nth(2)).toContainText(LONG_NAME);
    await expect(settings.accountRows.nth(3)).toContainText("Zeta");

    // A long account name never widens the page on a 375 px phone
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(settings.accountRows.first()).toBeVisible();
    expect(await page.getByRole("main").evaluate((main) => main.scrollWidth - main.clientWidth)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1280, height: 720 });

    // alpha made main gets the next manual transaction (main is preselected)
    await settings.accountAction("alpha", MAKE_MAIN);
    await expect(settings.accountRows.first()).toContainText("alpha");
    const alphaId = String((await readDocument(`budget_profiles/${user.uid}`))?.mainAccountId);
    const alphaMonths = async () => (await listDocumentIds("budget_months")).filter((id) => id.startsWith(`${alphaId}_`));
    await open("transactions");
    await transactions.addExpense({ amount: "5", payee: "Kiosk" });
    await expect(transactions.row("Kiosk")).toBeVisible();
    await expect.poll(alphaMonths).toHaveLength(1);

    // Zeta becomes main, so alpha can be hidden: its transaction leaves the list
    await open("settings");
    await settings.accountAction("Zeta", MAKE_MAIN);
    await expect(settings.accountRows.first()).toContainText("Zeta");
    await settings.accountAction("alpha", /^(hide|ukryj)$/i);
    await expect(settings.accountRows.filter({ hasText: "alpha" })).toContainText(/hidden|ukryte/i);
    await open("transactions");
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Delete alpha: the confirmation counts its transaction, and its month goes with it
    await open("settings");
    await settings.accountAction("alpha", /^(delete|usuń)$/i);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(/1 transaction\b|1 transakcja/i);
    await dialog.getByRole("button", { name: /^(delete account|usuń konto)$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(settings.accountRows).toHaveCount(3);
    await expect.poll(alphaMonths).toEqual([]);
  });
});
