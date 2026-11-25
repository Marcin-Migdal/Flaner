import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
// A bank no parser recognizes: Polish dates, comma decimals, a signed amount column
const FILE = {
  name: "other-bank.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    [
      "Data;Kwota;Kontrahent;Tytuł;Nr ref",
      "03.11.2026;-12,50;Sklep Zielony;Zakupy;A1",
      "04.11.2026;2 500,00;Pracodawca;Pensja;A2",
      "05.11.2026;-1 234,56;Salon Meblowy;Szafa;A3",
    ].join("\r\n"),
  ),
};

test.describe("Budget import template", () => {
  test("an unknown CSV is mapped, saved as a template and imported; the next file of its kind is recognized", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    // The main currency follows the browser locale (not PLN): rates are served locally
    await page.route("https://api.frankfurter.dev/**", async (route) => {
      const url = new URL(route.request().url());
      const date = url.searchParams.get("date") ?? "";
      await route.fulfill({
        json: [{ date, base: url.searchParams.get("base"), quote: url.searchParams.get("quotes"), rate: 0.25 }],
      });
    });
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);
    const sheet = transactions.importSheet;

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Other bank" });
    await expect(transactions.emptyStateTitle).toBeVisible();

    // Not recognized: the Settings step opens on column mapping
    await transactions.headerImportButton.click();
    await sheet.locator('input[type="file"]').setInputFiles(FILE);
    await expect(sheet.getByText(/^(column mapping|przypisanie kolumn)$/i)).toBeVisible();
    await transactions.chooseImportOption(/^Data$/, /^(date|data)$/i);
    await transactions.chooseImportOption(/^Kwota$/, /^(amount|kwota) \(/i);
    await transactions.chooseImportOption(/^Kontrahent$/, /^(payee|odbiorca)$/i);
    await transactions.chooseImportOption(/^Tytuł$/, /^(description|opis)$/i);
    await transactions.chooseImportOption(/^(date format|format daty)$/i, /^DD\.MM\.(YYYY|RRRR) \(28\.11\.2026\)$/);
    await sheet.getByLabel(/^(template name|nazwa szablonu)$/i).fill("Other bank");
    await expect(sheet.getByText(/^(3 of 3 rows read|odczytano 3 z 3 wierszy)/i)).toBeVisible();
    await sheet.getByRole("button", { name: /^(preview|podgląd)$/i }).click();

    await expect(transactions.importFilter(/new|nowe/, 3)).toBeVisible();
    await expect(transactions.importFilter(/errors|błędy/, 0)).toBeVisible();
    await expect(sheet.getByRole("listitem").filter({ hasText: "Salon Meblowy" })).toBeVisible();
    await sheet.getByRole("button", { name: /^(import 3 transactions|importuj 3 transakcje)$/i }).click();
    await expect(sheet.getByText(/^(3 transactions imported|zaimportowano 3 transakcje)$/i)).toBeVisible();
    await sheet.getByRole("button", { name: /^(close|zamknij)$/i }).click();
    await expect(sheet).toBeHidden();

    // The same kind of file again: recognized by the saved template, no mapping asked, every row a duplicate
    await transactions.headerImportButton.click();
    await expect(sheet.getByText(/your import templates: other bank|twoje szablony importu: other bank/i)).toBeVisible();
    await sheet.locator('input[type="file"]').setInputFiles(FILE);
    await expect(sheet.getByText(/^(recognized from the file|rozpoznany z pliku)/i)).toBeVisible();
    await expect(sheet.getByText(/^(column mapping|przypisanie kolumn)$/i)).toBeHidden();
    await sheet.getByRole("button", { name: /^(preview|podgląd)$/i }).click();
    await expect(transactions.importFilter(/duplicates|duplikaty/, 3)).toBeVisible();
    await expect(transactions.importFilter(/new|nowe/, 0)).toBeVisible();
  });
});
