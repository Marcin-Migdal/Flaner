import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const SHOPPING = /^(shopping|zakupy)$/i;

test.describe("Budget categorization rules", () => {
  test("a category set on the list teaches a rule that prefills the next manual entry and is tuned in Settings", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Cash" });
    await transactions.addExpense({ amount: "20", payee: "Bakery Central 12" });
    await expect(transactions.addDialog).toBeHidden();

    // Setting the category on the list teaches a keyword rule for that payee
    const picker = transactions.row("Bakery Central 12").getByRole("combobox", { name: /^(category of|kategoria:)/i });
    await picker.fill("Shopping");
    await page.keyboard.press("Enter");
    await expect(transactions.row("Bakery Central 12").getByText(SHOPPING)).toBeVisible();

    // The next entry from that payee gets the category as soon as the payee is typed, saved confirmed
    await transactions.addTransactionButton.click();
    await transactions.addDialog.getByLabel(/^(amount|kwota)$/i).fill("7");
    await transactions.addDialog.getByLabel(/^(payee|odbiorca \/ nadawca)$/i).fill("Bakery Central 99");
    await expect(transactions.addDialog.getByText(SHOPPING)).toBeVisible();
    await transactions.addDialog.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i }).click();
    await expect(transactions.addDialog).toBeHidden();
    await expect(
      transactions.row("Bakery Central 99").getByRole("button", { name: /^(confirm category|potwierdź kategorię)/i }),
    ).toHaveCount(0);

    // Settings → Rules lists the rule; its keyword is shortened in place (in-app navigation: no second unlock)
    await page.getByRole("link", { name: /^(settings|ustawienia)$/i }).click();
    await page.getByRole("tab", { name: /^(rules|reguły)$/i }).click();
    await expect(page).toHaveURL(/#rules$/);
    const keyword = page.getByRole("textbox", { name: /^(keyword|słowo kluczowe) bakery central$/i });
    await expect(keyword).toHaveValue("bakery central");
    await expect(page.getByRole("main").getByText(SHOPPING)).toBeVisible();
    await keyword.fill("bakery");
    await keyword.press("Enter");
    await expect(page.getByRole("textbox", { name: /^(keyword|słowo kluczowe) bakery$/i })).toHaveValue("bakery");
  });
});
