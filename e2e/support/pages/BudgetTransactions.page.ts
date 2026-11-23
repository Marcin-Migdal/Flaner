import { type Locator, type Page } from "@playwright/test";

export type ManualTransactionInput = { amount: string; payee: string };

/** `/planning/budget/transactions` once the budget is unlocked. */
export class BudgetTransactionsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyStateTitle: Locator;
  readonly importButton: Locator;
  readonly addTransactionButton: Locator;
  readonly addDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { level: 1, name: /^(transactions|transakcje)$/i });
    this.emptyStateTitle = main.getByRole("heading", { name: /^(no transactions yet|brak transakcji)$/i });
    this.importButton = main.getByRole("button", { name: /^(import file|importuj plik)$/i });
    this.addTransactionButton = main.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i });
    this.addDialog = page.getByRole("dialog", { name: /^(add transaction|dodaj transakcję)$/i });
  }

  /** A row of the list, found by its payee. */
  row(payee: string): Locator {
    return this.page.getByRole("main").getByRole("listitem").filter({ hasText: payee });
  }

  /** Adds an expense in the main account's currency, without a category. */
  async addExpense({ amount, payee }: ManualTransactionInput) {
    await this.addTransactionButton.click();
    await this.addDialog.getByLabel(/^(amount|kwota)$/i).fill(amount);
    await this.addDialog.getByLabel(/^(payee|odbiorca \/ nadawca)$/i).fill(payee);
    await this.addDialog.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i }).click();
  }

  async deleteTransaction(payee: string) {
    await this.page.getByRole("button", { name: new RegExp(`^(delete|usuń) ${payee}$`, "i") }).click();
    await this.page
      .getByRole("dialog", { name: /^(delete this transaction\?|usunąć tę transakcję\?)$/i })
      .getByRole("button", { name: /^(delete|usuń)$/i })
      .click();
  }
}
