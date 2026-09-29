import { type Page, type Locator } from "@playwright/test";

export class AppShellPage {
  readonly page: Page;
  readonly mainNav: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainNav = page.getByRole("navigation");
    this.bottomNav = page.locator("nav.fixed.bottom-0, nav[aria-label='Mobile Navigation']");
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }
}
