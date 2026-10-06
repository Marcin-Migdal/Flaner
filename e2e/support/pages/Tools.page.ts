import { type Page, type Locator } from "@playwright/test";

export class ToolsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly spoolsTab: Locator;
  readonly templatesTab: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /spooler|szpule/i });
    this.subtitle = page.locator("p.text-muted-foreground").first();
    this.spoolsTab = page.getByRole("tab", { name: /spools|szpule/i });
    this.templatesTab = page.getByRole("tab", { name: /templates|szablony/i });
    this.settingsButton = page.locator("button").filter({ hasText: /preferences|preferencje|settings|ustawienia/i }).first();
  }

  async goto() {
    await this.page.goto("/tools/spooler");
    await this.page.locator("text=Loading...").waitFor({ state: "detached" }).catch(() => {});
  }
}
