import { type Locator, type Page } from "@playwright/test";

/** `/planning/budget/planner` once the budget is unlocked. */
export class BudgetPlannerPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addLimitButton: Locator;
  readonly addLimitDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { level: 1, name: /^(planner|planer)$/i });
    this.addLimitButton = main.getByRole("button", { name: /^(add limit|dodaj limit)$/i }).first();
    this.addLimitDialog = page.getByRole("dialog", { name: /^(add limit|dodaj limit)$/i });
  }

  /** A category card, found by the category's name. */
  card(category: RegExp): Locator {
    return this.page.getByRole("main").getByRole("region", { name: category });
  }

  /** The inline limit field of a category or subcategory. */
  limitField(name: RegExp): Locator {
    return this.page.getByRole("spinbutton", { name: new RegExp(`^(limit for|limit dla:) ${name.source}$`, "i") });
  }

  /** Add limit from the Expenses header: picks the category from the picker's list. */
  async addLimit({ category, amount }: { category: RegExp; amount: string }) {
    await this.addLimitButton.click();
    await this.addLimitDialog.getByLabel(/^(category|kategoria)$/i).click();
    await this.page.getByRole("option", { name: category }).click();
    await this.addLimitDialog.getByLabel(/^limit$/i).fill(amount);
    await this.addLimitDialog.getByRole("button", { name: /^(save|zapisz)$/i }).click();
  }
}
