import { type Locator, type Page } from "@playwright/test";

/** The event scheduler (`/planning/scheduling`), showing the selected event. */
export class SchedulerPage {
  readonly page: Page;
  readonly root: Locator;
  readonly dialog: Locator;
  /** A participant who has not voted on every slot yet. */
  readonly notVoted: Locator;
  readonly dateConfirmed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole("heading", { name: /event|wydarzen|no events/i }).first();
    this.dialog = page.getByRole("dialog");
    this.notVoted = page.getByText("Not voted");
    this.dateConfirmed = page.getByText("Date Confirmed");
  }

  async goto() {
    await this.page.goto("/planning/scheduling");
    await this.root.waitFor({ state: "visible" });
  }

  /** Votes "no" on every slot the signed-in participant has not voted on yet. */
  async markRemainingAsNo(count: number) {
    await this.page.getByRole("button", { name: new RegExp(`mark remaining \\(${count}\\) as no`, "i") }).click();
    await this.dialog.getByRole("button", { name: /^mark as no$/i }).click();
  }

  /** Creator only: finalizes the event on the slot the modal preselects (the top pick). */
  async finalizeTopSlot() {
    await this.page.getByRole("button", { name: /finalize event date/i }).click();
    await this.page.getByRole("button", { name: /confirm this date/i }).click();
  }

  /** Opens the edit modal of the selected event. */
  async openEdit() {
    await this.page.getByRole("button", { name: /^edit$/i }).click();
  }

  /** The edit modal's notice that a finalized event takes only a new name and description. */
  get finalizedEditNotice(): Locator {
    return this.dialog.getByText(/only its name and description can be changed/i);
  }

  /** The edit modal's deadline field (hidden for a finalized event). */
  get deadlineField(): Locator {
    return this.dialog.getByText(/deadline for dates selection/i);
  }

  /** Renames the event in the open edit modal and saves it. */
  async renameInEdit(name: string) {
    await this.dialog.getByLabel(/event name/i).fill(name);
    await this.dialog.getByRole("button", { name: /^save$/i }).click();
  }

  async reopenVoting() {
    await this.page.getByRole("button", { name: /reopen voting/i }).click();
    await this.dialog.getByRole("button", { name: /reopen voting/i }).click();
  }
}
