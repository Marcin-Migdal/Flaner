import { type Locator, type Page } from "@playwright/test";

export type ManualTransactionInput = { amount: string; payee: string; category?: RegExp };

/** `/planning/budget/transactions` once the budget is unlocked. */
export class BudgetTransactionsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyStateTitle: Locator;
  readonly importButton: Locator;
  readonly addTransactionButton: Locator;
  readonly addDialog: Locator;
  readonly headerImportButton: Locator;
  readonly importSheet: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { level: 1, name: /^(transactions|transakcje)$/i });
    this.emptyStateTitle = main.getByRole("heading", { name: /^(no transactions yet|brak transakcji)$/i });
    this.importButton = main.getByRole("button", { name: /^(import file|importuj plik)$/i });
    this.addTransactionButton = main.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i });
    this.addDialog = page.getByRole("dialog", { name: /^(add transaction|dodaj transakcję)$/i });
    this.headerImportButton = main.getByRole("button", { name: /^(import|importuj)$/i });
    this.importSheet = page.getByRole("dialog", { name: /^(import a statement|import wyciągu)$/i });
  }

  /** Opens the import wizard and walks File → Settings (bank and account as detected) to the Preview step. */
  /** Imports a file up to the Preview step; `targets` maps a bank account of the file (by its masked number) to an option. */
  async openImportPreview(filePath: string, targets: [fileAccount: RegExp, option: string][] = []) {
    await this.headerImportButton.click();
    await this.importSheet.locator('input[type="file"]').setInputFiles(filePath);
    for (const [fileAccount, option] of targets) {
      // react-select's input is not clickable; focus it and open the menu with the keyboard
      await this.importSheet.getByLabel(fileAccount).focus();
      await this.page.keyboard.press("ArrowDown");
      await this.page.getByRole("option", { name: option, exact: true }).click();
    }
    await this.importSheet.getByRole("button", { name: /^(preview|podgląd)$/i }).click();
  }

  /** Picks an option of a react-select in the import sheet (its input is not clickable: focus it, open the menu with the keyboard). */
  async chooseImportOption(label: RegExp, option: RegExp) {
    await this.importSheet.getByLabel(label).focus();
    await this.page.keyboard.press("ArrowDown");
    // The menu is portaled with a fixed position and may open below the viewport, out of a real click's reach
    await this.page.getByRole("option", { name: option }).dispatchEvent("click");
  }

  /** Opens the import wizard and reads `file` (a path or an in-memory file) into the Settings step. */
  async openImportSettings(file: Parameters<Locator["setInputFiles"]>[0]) {
    await this.headerImportButton.click();
    await this.importSheet.locator('input[type="file"]').setInputFiles(file);
  }

  /** The Settings step's column mapping of a file no bank or template recognizes. */
  get columnMapping(): Locator {
    return this.importSheet.getByRole("group", { name: /^(column mapping|przypisanie kolumn)$/i });
  }

  async nameImportTemplate(name: string) {
    await this.importSheet.getByLabel(/^(template name|nazwa szablonu)$/i).fill(name);
  }

  /** The column mapping's count of rows it reads. */
  mappingReadRows(count: number, total: number): Locator {
    return this.importSheet.getByText(
      new RegExp(`^(${count} of ${total} rows read|odczytano ${count} z ${total} wierszy)`, "i"),
    );
  }

  async continueToPreview() {
    await this.importSheet.getByRole("button", { name: /^(preview|podgląd)$/i }).click();
  }

  /** Imports the checked preview rows and closes the wizard from the Result step. */
  async importAndClose(count: number, countLabelPl: string) {
    await this.importSheet
      .getByRole("button", { name: new RegExp(`^(import ${count} transactions|importuj ${count} ${countLabelPl})$`, "i") })
      .click();
    await this.importSheet
      .getByText(new RegExp(`^(${count} transactions imported|zaimportowano ${count} ${countLabelPl})$`, "i"))
      .waitFor();
    // The Result step's own Close, not the sheet's corner button
    await this.importSheet.getByRole("button", { name: /^(close|zamknij)$/i }).last().click();
  }

  /** A status filter tab of the import preview, with its count. */
  importFilter(name: RegExp, count: number): Locator {
    return this.importSheet.getByRole("tab", { name: new RegExp(`^(${name.source})\\s*${count}$`, "i") });
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
    return this.row(payee).getByRole("textbox", { name: new RegExp(`^(payee of|odbiorca / nadawca:) ${payee}$`, "i") });
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

  /** Adds an expense dated today in the main account's currency, without a category unless one is given. */
  async addExpense({ amount, payee, category }: ManualTransactionInput) {
    await this.addTransactionButton.click();
    await this.addDialog.getByLabel(/^(amount|kwota)$/i).fill(amount);
    await this.addDialog.getByLabel(/^(payee|odbiorca \/ nadawca)$/i).fill(payee);
    if (category) {
      await this.addDialog.getByLabel(/^(category|kategoria)$/i).click();
      await this.page.getByRole("option", { name: category }).click();
    }
    await this.addDialog.getByRole("button", { name: /^(add transaction|dodaj transakcję)$/i }).click();
  }

  /** Make recurring from the expanded row, with the dialog's default rule (monthly on the transaction's day). */
  async makeRecurring(payee: string) {
    await this.expandRow(payee);
    await this.row(payee).getByRole("button", { name: /^(make recurring|ustaw jako cykliczną)$/i }).click();
    await this.page
      .getByRole("dialog", { name: /^(make recurring|ustaw jako cykliczną)$/i })
      .getByRole("button", { name: /^(make recurring|ustaw jako cykliczną)$/i })
      .click();
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

  /** Opens the view from the sidebar (in-app navigation keeps the budget unlocked). */
  async openFromNav() {
    await this.page.getByRole("link", { name: /^(transactions|transakcje)$/i }).first().click();
  }

  /** Sets a row's category with its inline picker (desktop): types the name and picks the first match. */
  async setRowCategory(payee: string, category: string) {
    await this.row(payee).getByRole("combobox", { name: /^(category of|kategoria:)/i }).fill(category);
    await this.page.keyboard.press("Enter");
  }

  /** The "?" confirm button of a row whose category is unconfirmed (none once confirmed). */
  confirmCategoryButton(payee: string): Locator {
    return this.row(payee).getByRole("button", { name: /^(confirm category|potwierdź kategorię)/i });
  }
}
