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

  /** A row in the members list (the page content lists usernames only there; the shell's own is outside `main`). */
  member(username: string): Locator {
    return this.page.getByRole("main").getByText(username, { exact: true });
  }

  /** The invite modal's button for the searched user: "Invite", or "Invited" once the invitation is pending. */
  inviteCandidateButton(state: "invite" | "invited"): Locator {
    return this.dialog.getByRole("button", { name: state === "invite" ? /^invite$/i : /^invited$/i });
  }

  /** Invites a user found by their (unique) username; the modal stays open with `keepOpen`. */
  async inviteUser(username: string, { keepOpen = false }: { keepOpen?: boolean } = {}) {
    await this.inviteButton.click();
    await this.dialog.getByPlaceholder(/search users/i).fill(username);
    await this.inviteCandidateButton("invite").click();
    await this.inviteCandidateButton("invited").waitFor();
    if (!keepOpen) await this.closeDialog();
  }

  async closeDialog() {
    await this.page.keyboard.press("Escape");
  }

  /** A join request in the owner's requests sheet. */
  request(username: string): Locator {
    return this.dialog.getByText(username);
  }

  async acceptRequest() {
    await this.requestsButton.click();
    await this.dialog.getByRole("button", { name: /^accept$/i }).click();
  }

  async declineRequest() {
    await this.requestsButton.click();
    await this.dialog.getByRole("button", { name: /^decline$/i }).click();
  }

  async openRequests() {
    await this.requestsButton.click();
  }

  /** Owner only: deletes the group from the manage sheet and lands back on the groups list. */
  async deleteGroup() {
    await this.page.getByRole("button", { name: /^manage$/i }).click();
    await this.dialog.getByRole("button", { name: /^delete group$/i }).click();
    await this.page.getByRole("button", { name: /^yes, delete group$/i }).click();
    await this.page.waitForURL(/\/community\/groups$/);
  }
}
