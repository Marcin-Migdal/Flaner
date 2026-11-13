import { type Locator, type Page } from "@playwright/test";

/** The splits list (`/planning/splits`) and its "New split group" modal. */
export class PlanningPage {
  readonly page: Page;
  readonly createSplitGroupButton: Locator;
  readonly groupModalTitle: Locator;
  readonly groupNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createSplitGroupButton = page.getByRole("button", { name: /new group|nowa grupa/i }).first();
    this.groupModalTitle = page.getByRole("heading", { name: /new split group|nowa grupa/i });
    this.groupNameInput = page.getByRole("dialog").getByRole("textbox", { name: /^(group name|nazwa grupy)$/i });
  }

  async gotoSplits() {
    await this.page.goto("/planning/splits");
    await this.createSplitGroupButton.waitFor({ state: "visible" });
  }

  async closeDialog() {
    await this.page.keyboard.press("Escape");
  }
}
