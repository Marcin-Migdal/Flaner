import { type Page, type Locator } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;
  readonly darkModeSwitch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole("textbox").first();
    this.saveButton = page.getByRole("button", { name: /save|zapisz/i });
    this.backButton = page.locator("button").filter({ has: page.locator("svg.lucide-arrow-left") }).first();
    this.darkModeSwitch = page.getByRole("checkbox", { name: /dark mode|tryb ciemny/i }).or(page.locator("button[role='switch']")).first();
  }

  async goto() {
    await this.page.goto("/settings");
    await this.page.locator("text=Loading...").waitFor({ state: "detached" }).catch(() => {});
  }
}
