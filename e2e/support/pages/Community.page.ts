import { type Page, type Locator } from "@playwright/test";

export class CommunityPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createGroupButton: Locator;
  readonly filterTriggerButton: Locator;
  readonly searchTriggerButton: Locator;
  readonly emptyStateActionBtn: Locator;

  // Create Group Modal locators
  readonly modalTitle: Locator;
  readonly groupNameInput: Locator;
  readonly groupDescInput: Locator;
  readonly submitModalButton: Locator;
  readonly cancelModalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: /^groups$/i });
    this.createGroupButton = page.getByRole("button", { name: /create group|utwórz grupę/i }).first();
    this.filterTriggerButton = page.locator("[data-slot='field']").first();
    this.searchTriggerButton = page.locator("[data-slot='field']").nth(1);
    this.emptyStateActionBtn = page.getByRole("button", { name: /create your first group|utwórz swoją pierwszą grupę/i });

    this.modalTitle = page.getByRole("heading", { name: /create a group|utwórz grupę/i });
    this.groupNameInput = page.getByPlaceholder(/enter name|wprowadź nazwę/i);
    this.groupDescInput = page.getByPlaceholder(/what is this group about|o czym jest ta grupa/i);
    this.submitModalButton = page.locator("div[role='dialog']").getByRole("button", { name: /create group|utwórz grupę/i });
    this.cancelModalButton = page.locator("div[role='dialog']").getByRole("button", { name: /cancel|anuluj/i });
  }

  async goto() {
    await this.page.goto("/community/groups");
    await this.heading.waitFor({ state: "visible" });
  }

  async openCreateModal() {
    await this.createGroupButton.click();
  }

  async fillGroupForm(name: string, description?: string) {
    await this.groupNameInput.fill(name);
    if (description) {
      await this.groupDescInput.fill(description);
    }
  }

  async submitGroupForm() {
    await this.submitModalButton.click();
  }

  async cancelGroupModal() {
    await this.cancelModalButton.click();
  }
}
