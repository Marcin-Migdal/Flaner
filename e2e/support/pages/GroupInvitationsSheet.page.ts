import { type Locator, type Page } from "@playwright/test";
import { CommunityPage } from "./Community.page";

/** The invitee's "Group Invitations" side sheet on the groups list. */
export class GroupInvitationsSheet {
  readonly page: Page;
  /** Shown only while there are invitations to answer. */
  readonly trigger: Locator;
  readonly sheet: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trigger = page.getByRole("button", { name: /^group invitations$/i });
    this.sheet = page.getByRole("dialog", { name: /^group invitations$/i });
  }

  /** Opens the groups list and its invitations sheet. */
  async open() {
    await new CommunityPage(this.page).goto();
    await this.trigger.click();
  }

  invitation(groupName: string): Locator {
    return this.sheet.getByText(groupName);
  }

  // Rows have no landmark of their own: specs answer a single pending invitation
  async accept() {
    await this.sheet.getByRole("button", { name: /^(accept|akceptuj)$/i }).click();
  }

  async reject() {
    await this.sheet.getByRole("button", { name: /^(reject|odrzuć)$/i }).click();
  }
}
