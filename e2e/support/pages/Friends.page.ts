import { type Locator, type Page } from "@playwright/test";

/** The friends list (`/community/friends`). */
export class FriendsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: /^friends$/i });
  }

  async goto() {
    await this.page.goto("/community/friends");
    await this.heading.waitFor({ state: "visible" });
  }

  /** A friend on the list, by their current username. */
  friend(username: string): Locator {
    return this.page.getByRole("main").getByText(username, { exact: true });
  }
}
