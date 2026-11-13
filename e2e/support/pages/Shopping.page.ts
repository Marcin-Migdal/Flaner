import { type Locator, type Page } from "@playwright/test";

/** The shopping MFE (a placeholder view for now). */
export class ShoppingPage {
  readonly page: Page;
  /** The MFE's root container, present once the remote has mounted. */
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("shopping");
  }

  async goto() {
    await this.page.goto("/shopping/lists");
  }
}
