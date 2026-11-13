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

  spoolCard(name: string): Locator {
    return this.page.getByRole("article", { name });
  }

  undoButton(name: string): Locator {
    return this.spoolCard(name).getByTitle(/undo last print|cofnij ostatni wydruk/i);
  }

  async recordPrint(name: string, modelWeight: number) {
    await this.spoolCard(name).getByRole("button", { name: /^(print|drukuj)$/i }).click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByPlaceholder(/24[.,]5/).fill(String(modelWeight));
    await dialog.getByRole("button", { name: /^(print|drukuj)$/i }).click();
  }

  async undoLastPrint(name: string) {
    await this.undoButton(name).click();
    await this.page.getByRole("dialog").getByRole("button", { name: /undo last print|cofnij ostatni wydruk/i }).click();
  }

  /** Opens the add-template form from the Templates tab and returns its dialog. */
  async openAddTemplate(): Promise<Locator> {
    await this.templatesTab.click();
    await this.page.getByRole("button", { name: /add template|dodaj szablon/i }).first().click();
    return this.page.getByRole("dialog");
  }

  /** Opens the material select of the template form; its options are `role="option"`. */
  async openMaterialSelect(dialog: Locator) {
    await dialog.getByLabel(/^(material|materiał)$/i).click();
  }

  materialOption(name: string): Locator {
    return this.page.getByRole("option", { name });
  }

  async deleteCustomMaterial(name: string) {
    await this.materialOption(name).getByRole("button", { name: /delete this custom material|usuń ten własny materiał/i }).click();
    await this.page.getByRole("dialog").getByRole("button", { name: /^(delete|usuń)$/i }).click();
  }

  async goto() {
    await this.page.goto("/tools/spooler");
    await this.page.locator("text=Loading...").waitFor({ state: "detached" }).catch(() => {});
  }
}
