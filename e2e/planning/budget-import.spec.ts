import path from "node:path";
import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
// Anonymised real Millennium export: 30 rows, two accounts, UTF-8 with BOM, CRLF, all in PLN
const FIXTURE = path.join(__dirname, "..", "..", "fixtures", "bank-statements", "millennium", "millennium-2026-10.csv");

// The file's 30 rows fall on 18 distinct days, all in PLN
const DISTINCT_DAYS = 18;

test.describe("Budget statement import", () => {
  test("a Millennium file is mapped, previewed, imported and listed; importing it again finds only duplicates", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    // The main currency follows the browser locale (not PLN), so every row needs a PLN rate: served locally
    const rateRequests: string[] = [];
    await page.route("https://api.frankfurter.dev/**", async (route) => {
      const url = new URL(route.request().url());
      const date = url.searchParams.get("date") ?? "";
      rateRequests.push(`${url.searchParams.get("base")}|${date}`);
      await route.fulfill({
        json: [{ date, base: url.searchParams.get("base"), quote: url.searchParams.get("quotes"), rate: 0.25 }],
      });
    });
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Millennium" });
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Both bank accounts of the file go to the one Flaner account
    await transactions.openImportPreview(FIXTURE, [
      [/9694$/, "Millennium"],
      [/0369$/, "Millennium"],
    ]);
    const sheet = transactions.importSheet;
    await expect(transactions.importFilter(/new|nowe/, 30)).toBeVisible();
    await expect(transactions.importFilter(/duplicates|duplikaty/, 0)).toBeVisible();
    await expect(transactions.importFilter(/errors|błędy/, 0)).toBeVisible();
    await expect(sheet.getByRole("heading", { name: /^(october|październik) 2026$/i })).toBeVisible();
    // One request per (currency, date)
    expect(rateRequests).toHaveLength(DISTINCT_DAYS);
    expect(new Set(rateRequests).size).toBe(DISTINCT_DAYS);
    await expect(sheet.getByRole("listitem").filter({ hasText: /Gęś i Syn.*Opis 32/ })).toContainText(/new|nowa/i);

    await sheet.getByRole("button", { name: /^(import 30 transactions|importuj 30 transakcji)$/i }).click();
    await expect(sheet.getByText(/^(30 transactions imported|zaimportowano 30 transakcji)$/i)).toBeVisible();
    await sheet.getByRole("button", { name: /^(show imported transactions|pokaż zaimportowane transakcje)$/i }).click();

    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/month=2026-10/);
    // On desktop the list's description is an inline field, so the row is found by the field's value
    await expect(transactions.row("Gęś i Syn").filter({ has: page.locator('input[value="Opis 32"]') })).toBeVisible();
    await expect(transactions.row("Usługi Łąka Sp. z o.o. 12")).toBeVisible();

    // The same file again, its bank accounts preselected from the remembered mapping: every row is already in the account
    await transactions.openImportPreview(FIXTURE);
    await expect(transactions.importFilter(/duplicates|duplikaty/, 30)).toBeVisible();
    await expect(transactions.importFilter(/new|nowe/, 0)).toBeVisible();
    await expect(sheet.getByRole("button", { name: /^(import 0 transactions|importuj 0 transakcji)$/i })).toBeDisabled();
    // Rates are cached: the second preview requests none
    expect(rateRequests).toHaveLength(DISTINCT_DAYS);
  });
});
