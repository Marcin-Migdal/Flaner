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

  /** A row of the list, found by its payee (on desktop the payee is an inline field, so by the row's Details button). */
  row(payee: string): Locator {
    return this.page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ has: this.page.getByRole("button", { name: new RegExp(`^(details of|szczegóły:) ${payee}$`, "i") }) });
  }

  /** The inline payee field of a row (desktop). */
  payeeField(payee: string): Locator {
    return this.row(payee).getByRole("textbox", { name: /^(payee|odbiorca \/ nadawca)$/i });
  }

  async expandRow(payee: string) {
    await this.row(payee).getByRole("button", { name: new RegExp(`^(details of|szczegóły:) ${payee}$`, "i") }).click();
  }

  async selectRow(payee: string) {
    await this.page.getByRole("checkbox", { name: new RegExp(`^(select|zaznacz:) ${payee}$`, "i") }).check();
  }

  get bulkActions(): Locator {
    return this.page.getByRole("toolbar", { name: /^(bulk actions|akcje zbiorcze)$/i });
  }

  /** Adds an expense in the main account's currency, without a category. */
  async addExpense({ amount, payee }: ManualTransactionInput) {
    await this.addTransactionButton.click();
    await this.addDialog.getByLabel(/^(amount|kwota)$/i).fill(amount);
    await this.addDialog.getByLabel(/^(payee|odbiorca \/ nadawca)$/i).fill(payee);
    await this.addDialog.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i }).click();
  }

  async deleteTransaction(payee: string) {
    await this.expandRow(payee);
    await this.row(payee).getByRole("button", { name: /^(delete|usuń)$/i }).click();
    await this.page
      .getByRole("dialog", { name: /^(delete this transaction\?|usunąć tę transakcję\?)$/i })
      .getByRole("button", { name: /^(delete|usuń)$/i })
      .click();
  }

  /** Deletes the selected rows from the bulk actions toolbar, after confirmation. */
  async bulkDelete() {
    await this.bulkActions.getByRole("button", { name: /^(delete|usuń)$/i }).click();
    await this.page
      .getByRole("dialog", { name: /^(delete \d+ transactions?\?|usunąć \d+ transakcj\S*\?)$/i })
      .getByRole("button", { name: /^(delete|usuń)$/i })
      .click();
  }
}
