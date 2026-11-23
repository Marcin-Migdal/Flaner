import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { readDocument } from "../support/helpers/emulator";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const PAYEE = "Secret corner shop";

test.describe("Budget manual transactions", () => {
  test("a transaction added by hand is listed, stored encrypted, kept after unlock and deleted after confirmation", async ({
    page,
  }) => {
    // Onboarding and unlock each run 600,000 PBKDF2 rounds in the browser
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Wallet" });
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Main account currency == main currency, so no exchange rate is fetched
    await transactions.addExpense({ amount: "12.34", payee: PAYEE });
    await expect(transactions.addDialog).toBeHidden();
    // On desktop the amount is an inline field
    await expect(
      transactions.row(PAYEE).getByRole("textbox", { name: new RegExp(`^(amount of|kwota:) ${PAYEE}$`, "i") }),
    ).toHaveValue(/^12[.,]34$/);

    // Today's month document of the main account, holding no readable payee or amount
    const profile = await readDocument(`budget_profiles/${user.uid}`);
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const monthPath = `budget_months/${String(profile?.mainAccountId)}_${month}`;
    const stored = JSON.stringify(await readDocument(monthPath));
    expect(stored).toContain(user.uid);
    expect(stored).not.toContain(PAYEE);
    expect(stored).not.toContain("1234");

    await page.reload();
    await gate.unlock(PASSPHRASE);
    await expect(transactions.row(PAYEE)).toBeVisible();

    await transactions.deleteTransaction(PAYEE);
    await expect(transactions.emptyStateTitle).toBeVisible();
    await expect.poll(() => readDocument(monthPath)).toBeUndefined();
  });

  test("a row is edited in place, filtered by the Type filter and deleted in bulk with another row", async ({ page }) => {
    test.slow();
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Wallet" });
    await transactions.addExpense({ amount: "10", payee: "Kiosk" });
    await expect(transactions.addDialog).toBeHidden();
    await transactions.addExpense({ amount: "20", payee: "Bakery" });
    await expect(transactions.addDialog).toBeHidden();

    // Inline edit, saved encrypted and kept after a reload
    await transactions.payeeField("Kiosk").fill("Newsagent");
    await transactions.payeeField("Kiosk").press("Enter");
    await expect(transactions.row("Newsagent")).toBeVisible();
    await page.reload();
    await gate.unlock(PASSPHRASE);
    await expect(transactions.row("Newsagent")).toBeVisible();

    // Both were added without a category, so both are unconfirmed; Confirmed hides them
    await page.getByRole("button", { name: /^(type|typ)$/i }).click();
    await page.getByRole("menuitemradio", { name: /^(confirmed|potwierdzone)$/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /^(no transactions match these filters|żadna transakcja nie pasuje do filtrów)$/i })).toBeVisible();
    await expect(page).toHaveURL(/status=confirmed/);
    await page.getByRole("main").getByRole("button", { name: /^(clear filters|wyczyść filtry)$/i }).first().click();

    await transactions.selectRow("Newsagent");
    await transactions.selectRow("Bakery");
    await transactions.bulkDelete();
    await expect(transactions.emptyStateTitle).toBeVisible();
  });
});
