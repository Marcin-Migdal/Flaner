import { type Locator, type Page } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly saveButton: Locator;
  readonly darkModeSwitch: Locator;
  readonly savedMessage: Locator;
  readonly usernameTakenError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: /^(settings|ustawienia)$/i });
    this.usernameInput = page.getByRole("textbox", { name: /^(username|nazwa użytkownika)$/i });
    this.saveButton = page.getByRole("button", { name: /save|zapisz/i });
    this.darkModeSwitch = page.getByRole("checkbox", { name: /dark mode|tryb ciemny/i });
    this.savedMessage = page.getByText(/settings updated successfully|zostały pomyślnie zaktualizowane/i);
    this.usernameTakenError = page.getByText(/this username is already taken|zajęta/i);
  }

  async goto() {
    await this.page.goto("/settings");
    await this.heading.waitFor({ state: "visible" });
  }

  async changeUsername(username: string) {
    await this.usernameInput.fill(username);
    await this.saveButton.click();
  }
}
