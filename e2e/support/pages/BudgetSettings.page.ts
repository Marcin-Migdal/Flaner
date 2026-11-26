import { type Locator, type Page } from "@playwright/test";

/** `/planning/budget/settings` once the budget is unlocked: Accounts & security, Categories and Rules tabs. */
export class BudgetSettingsPage {
  readonly page: Page;
  readonly lockButton: Locator;
  readonly accountRows: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.lockButton = main.getByRole("button", { name: /^(lock budget|zablokuj budżet)$/i });
    this.accountRows = main.getByRole("region", { name: /^(accounts|konta)$/i }).getByRole("listitem");
  }

  async addAccount(name: string) {
    await this.page.getByRole("main").getByRole("button", { name: /^(add account|dodaj konto)$/i }).click();
    const dialog = this.page.getByRole("dialog", { name: /^(add account|dodaj konto)$/i });
    await dialog.getByLabel(/^(account name|nazwa konta)$/i).fill(name);
    await dialog.getByRole("button", { name: /^(add account|dodaj konto)$/i }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  /** Opens the ⋯ menu of an account and picks an item. */
  async accountAction(name: string, item: RegExp) {
    await this.page.getByRole("button", { name: new RegExp(`^(actions for|akcje dla) ${name}$`, "i") }).click();
    await this.page.getByRole("menuitem", { name: item }).click();
  }

  /** Opens the view from the sidebar (in-app navigation keeps the budget unlocked). */
  async openFromNav() {
    await this.page.getByRole("link", { name: /^(settings|ustawienia)$/i }).click();
  }

  /** Opens a tab by its name (Categories → `#categories`, Rules → `#rules`). */
  async openTab(name: RegExp) {
    await this.page.getByRole("tab", { name }).click();
  }

  get tabPanel(): Locator {
    return this.page.getByRole("tabpanel");
  }

  /** The Expense categories card of the Categories tab. */
  get expenseCategories(): Locator {
    return this.page.getByRole("region", { name: /^(expense categories|kategorie wydatków)$/i });
  }

  /** The expense main categories by name, in the order shown (from their drag handles, while collapsed). */
  async expenseCategoryOrder(): Promise<string[]> {
    const handles = this.expenseCategories.getByRole("button", { name: /^(move|przenieś) /i });
    const labels = await handles.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? ""));
    return labels.map((label) => label.replace(/^\S+ /, ""));
  }

  /** Adds an expense category with the icon and colour picked by their tiles' titles. */
  async addExpenseCategory({ name, icon, color }: { name: string; icon: RegExp; color: number }) {
    await this.expenseCategories.getByRole("button", { name: /^(add category|dodaj kategorię)$/i }).click();
    const dialog = this.page.getByRole("dialog", { name: /^(add category|dodaj kategorię)$/i });
    await dialog.getByLabel(/^(name|nazwa)$/i).fill(name);
    // The radios are drawn by their tiles: pick by clicking the tile
    await dialog.getByTitle(icon).click();
    await dialog.getByTitle(new RegExp(`^(colour|kolor) ${color}$`, "i")).click();
    await dialog.getByRole("button", { name: /^(add|dodaj)$/i }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  /**
   * Moves an expense category one place up by keyboard (Space, ArrowUp, Space) on its drag handle. Each key waits
   * for its screen-reader announcement, since the next key needs the measured positions.
   */
  async moveExpenseCategoryUpByKeyboard(name: string, { from, total }: { from: number; total: number }) {
    const announced = (position: number) =>
      this.page
        .getByText(new RegExp(`^${name} (is at position|jest na pozycji) ${position} (of|z) ${total}\\.$`, "i"))
        .waitFor({ state: "attached" });
    await this.expenseCategories.getByRole("button", { name: new RegExp(`^(move|przenieś) ${name}$`, "i") }).focus();
    await this.page.keyboard.press("Space");
    await announced(from);
    await this.page.keyboard.press("ArrowUp");
    await announced(from - 1);
    await this.page.keyboard.press("Space");
  }

  async expandExpenseCategory(name: RegExp) {
    await this.expenseCategories
      .getByRole("button", { name: new RegExp(`^(show subcategories of|pokaż podkategorie) (${name.source})$`, "i") })
      .click();
  }

  /** Opens the delete dialog of an expense category or subcategory from its ⋯ menu. */
  async openDeleteCategory(name: RegExp): Promise<Locator> {
    await this.expenseCategories
      .getByRole("button", { name: new RegExp(`^(actions for|akcje dla) (${name.source})$`, "i") })
      .click();
    await this.page.getByRole("menuitem", { name: /^(delete|usuń)$/i }).click();
    return this.page.getByRole("dialog");
  }

  /** Picks the replacement in the open delete dialog and confirms. */
  async confirmDeleteCategory(dialog: Locator, replacement: string) {
    await dialog.getByLabel(/^(move their transactions to|przenieś ich transakcje do)$/i).fill(replacement);
    await this.page.keyboard.press("Enter");
    await dialog.getByText(replacement, { exact: true }).last().waitFor();
    await dialog.getByRole("button", { name: /^(yes, delete|tak, usuń)$/i }).click();
    await dialog.waitFor({ state: "hidden" });
  }
}
