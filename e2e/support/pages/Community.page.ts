import { type Locator, type Page } from "@playwright/test";

/** The groups list (`/community/groups`) and its "Create a group" modal. */
export class CommunityPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createGroupButton: Locator;
  readonly filterTriggerButton: Locator;
  readonly searchTriggerButton: Locator;
  /** The expanded search field (disabled until its trigger is clicked). */
  readonly searchInput: Locator;

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
    this.filterTriggerButton = page.getByRole("button", { name: /^filter my groups/i });
    this.searchTriggerButton = page.getByRole("button", { name: /^search groups/i });
    this.searchInput = page.getByRole("textbox", { name: /^search groups/i });

    const dialog = page.getByRole("dialog");
    this.modalTitle = page.getByRole("heading", { name: /create a group|utwórz grupę/i });
    this.groupNameInput = page.getByPlaceholder(/enter name|wprowadź nazwę/i);
    this.groupDescInput = page.getByPlaceholder(/what is this group about|o czym jest ta grupa/i);
    this.submitModalButton = dialog.getByRole("button", { name: /create group|utwórz grupę/i });
    this.cancelModalButton = dialog.getByRole("button", { name: /cancel|anuluj/i });
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

  /** Creates a group through the modal (private, no description). */
  async createGroup(name: string) {
    await this.openCreateModal();
    await this.fillGroupForm(name);
    await this.submitGroupForm();
  }

  /** Opens a group from the list by its card. */
  async openGroup(name: string) {
    await this.page.getByRole("button", { name }).click();
  }

  async search(query: string) {
    await this.searchTriggerButton.click();
    await this.searchInput.fill(query);
  }
}
