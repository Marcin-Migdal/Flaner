import { type Locator, type Page } from "@playwright/test";

/** `/planning/budget/settings` (Accounts & security tab) once the budget is unlocked. */
export class BudgetSettingsPage {
  readonly page: Page;
  readonly lockButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.lockButton = page.getByRole("main").getByRole("button", { name: /^(lock budget|zablokuj budżet)$/i });
  }
}
