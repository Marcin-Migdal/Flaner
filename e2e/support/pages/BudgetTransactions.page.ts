import { type Locator, type Page } from "@playwright/test";

/** `/planning/budget/transactions` once the budget is unlocked. */
export class BudgetTransactionsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyStateTitle: Locator;
  readonly importButton: Locator;
  readonly addTransactionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { level: 1, name: /^(transactions|transakcje)$/i });
    this.emptyStateTitle = main.getByRole("heading", { name: /^(no transactions yet|brak transakcji)$/i });
    this.importButton = main.getByRole("button", { name: /^(import file|importuj plik)$/i });
    this.addTransactionButton = main.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i });
  }
}
