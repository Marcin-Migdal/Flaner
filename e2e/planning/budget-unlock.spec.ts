import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetSettingsPage } from "../support/pages/BudgetSettings.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const NEW_PASSPHRASE = "green kettle hums softly";

test.describe("Budget lock and unlock", () => {
  // Every onboarding / unlock / passphrase change runs 600,000 PBKDF2 rounds in the browser
  test.slow();

  test("a remembered device opens without a prompt until the budget is locked", async ({ page }) => {
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);
    const settings = new BudgetSettingsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Cash" });
    await expect(transactions.emptyStateTitle).toBeVisible();

    // A new session asks for the passphrase; a wrong one points to the recovery key
    await page.reload();
    await gate.unlock("orange tractor sings loudly");
    await expect(gate.wrongPassphraseError).toBeVisible();
    await gate.unlock(PASSPHRASE);
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Remembered: a reload opens the budget straight away
    await page.reload();
    await expect(transactions.emptyStateTitle).toBeVisible();
    await expect(gate.unlockHeading).toBeHidden();

    // Lock budget: the unlock screen at once, and again after a reload
    await page.goto("/planning/budget/settings");
    await settings.lockButton.click();
    await expect(gate.unlockHeading).toBeVisible();
    await page.reload();
    await expect(gate.unlockHeading).toBeVisible();

    // Not remembered this time: the next reload asks again
    await gate.unlock(PASSPHRASE, { remember: false });
    await expect(settings.lockButton).toBeVisible();
    await page.reload();
    await expect(gate.unlockHeading).toBeVisible();
  });

  test("the recovery key unlocks and replaces a forgotten passphrase", async ({ page }) => {
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    const recoveryKey = await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Cash" });
    await expect(transactions.emptyStateTitle).toBeVisible();
    await page.reload();

    // Dashes and capitals are optional
    await gate.unlockWithRecoveryKey(recoveryKey.replace(/-/g, "").toLowerCase(), NEW_PASSPHRASE);
    await expect(transactions.emptyStateTitle).toBeVisible();

    // The new passphrase replaced the old one
    const settings = new BudgetSettingsPage(page);
    await page.goto("/planning/budget/settings");
    await settings.lockButton.click();
    await gate.unlock(PASSPHRASE);
    await expect(gate.wrongPassphraseError).toBeVisible();
    await gate.unlock(NEW_PASSPHRASE);
    await expect(settings.lockButton).toBeVisible();
  });
});
