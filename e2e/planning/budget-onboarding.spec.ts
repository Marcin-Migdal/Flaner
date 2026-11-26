import { expect, test } from "@playwright/test";
import type { BudgetAccountDoc, BudgetProfileDoc } from "../../packages/planning/src/api/budget/types";
import { signInAsNewUser } from "../support/helpers/auth";
import { deleteDocument, readDocument } from "../support/helpers/emulator";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const ACCOUNT_NAME = "My secret bank";

test.describe("Budget onboarding", () => {
  test("a first-time user sets up the budget and lands in an empty Transactions view", async ({ page }) => {
    // Onboarding and unlock each run 600,000 PBKDF2 rounds in the browser
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    // Any Budget page shows onboarding first
    await page.goto("/planning/budget/summary");
    await expect(gate.onboardingHeading).toBeVisible();

    const recoveryKey = await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: ACCOUNT_NAME });
    expect(recoveryKey).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);

    await expect(page).toHaveURL(/\/planning\/budget\/transactions$/);
    await expect(transactions.emptyStateTitle).toBeVisible();
    await expect(transactions.importButton).toBeVisible();
    await expect(transactions.addTransactionButton).toBeVisible();

    // Stored: keys, profile and the main account, whose name is not readable
    await expect.poll(() => readDocument(`budget_keys/${user.uid}`)).toBeDefined();
    const profile = await readDocument(`budget_profiles/${user.uid}`);
    expect(profile).toMatchObject({ mainCurrency: "USD" } satisfies Partial<BudgetProfileDoc>);
    const account = await readDocument(`budget_accounts/${String(profile?.mainAccountId)}`);
    expect(account).toMatchObject({ memberIds: [user.uid], defaultCurrency: "USD", hidden: false } satisfies Partial<
      Omit<BudgetAccountDoc, "wrappedKeys" | "payload">
    >);
    expect(JSON.stringify(account)).not.toContain(ACCOUNT_NAME);

    // Keys live in memory only: after a reload the budget asks for the passphrase again
    await page.reload();
    await expect(gate.unlockHeading).toBeVisible();
    await gate.unlock(PASSPHRASE);
    await expect(transactions.emptyStateTitle).toBeVisible();
  });

  test("an open tab shows onboarding again once the budget was reset on another device", async ({ page }) => {
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: ACCOUNT_NAME });
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Reset elsewhere, nobody has set it up again yet: the stored keys are gone
    await deleteDocument(`budget_keys/${user.uid}`);
    // Back to the tab: the stored keys are refetched on window focus
    await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));

    await expect(gate.onboardingHeading).toBeVisible();
    await expect(transactions.emptyStateTitle).not.toBeVisible();
  });
});
