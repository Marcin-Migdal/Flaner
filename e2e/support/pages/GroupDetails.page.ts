import { type Locator, type Page } from "@playwright/test";

export class GroupDetailsPage {
  readonly page: Page;
  readonly joinButton: Locator;
  readonly requestToJoinButton: Locator;
  readonly requestPendingButton: Locator;
  readonly inviteButton: Locator;
  readonly requestsButton: Locator;
  /** Only members see the members section, so it doubles as the "is a member" signal. */
  readonly membersHeading: Locator;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.joinButton = page.getByRole("button", { name: /^join group$/i });
    this.requestToJoinButton = page.getByRole("button", { name: /^request to join$/i });
    this.requestPendingButton = page.getByRole("button", { name: /^pending approval$/i });
    this.inviteButton = page.getByRole("button", { name: /^invite$/i });
    this.requestsButton = page.getByRole("button", { name: /^requests/i });
    this.membersHeading = page.getByRole("heading", { level: 2, name: /members/i });
    this.dialog = page.getByRole("dialog");
  }

  async goto(groupId: string) {
    await this.page.goto(`/community/groups/${groupId}`);
  }

  /** A row in the members list (scoped to the section, so the app shell's own username doesn't match). */
  member(username: string): Locator {
    return this.membersHeading.locator("xpath=..").getByText(username, { exact: true });
  }

  /** Invites a user found by their (unique) username through the invite modal. */
  async inviteUser(username: string) {
    await this.inviteButton.click();
    await this.dialog.getByPlaceholder(/search users/i).fill(username);
    await this.dialog.getByRole("button", { name: /^invite$/i }).click();
    await this.dialog.getByRole("button", { name: /^invited$/i }).waitFor();
    await this.page.keyboard.press("Escape");
  }

  async acceptRequest() {
    await this.requestsButton.click();
    await this.dialog.getByRole("button", { name: /^accept$/i }).click();
  }

  async declineRequest() {
    await this.requestsButton.click();
    await this.dialog.getByRole("button", { name: /^decline$/i }).click();
  }
}
