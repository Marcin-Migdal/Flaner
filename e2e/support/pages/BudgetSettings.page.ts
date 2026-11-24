import { type Locator, type Page } from "@playwright/test";

/** `/planning/budget/settings` (Accounts & security tab) once the budget is unlocked. */
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
}
