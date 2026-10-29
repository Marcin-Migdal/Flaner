import { type Page, type Locator } from "@playwright/test";

export class PlanningPage {
  readonly page: Page;

  // Splits View
  readonly splitsHeading: Locator;
  readonly createSplitGroupButton: Locator;
  readonly splitSearchInput: Locator;
  readonly splitsEmptyState: Locator;

  // Scheduler View
  readonly schedulerRoot: Locator;
  readonly createEventButton: Locator;

  // Split Group Modal
  readonly groupModalTitle: Locator;
  readonly groupNameInput: Locator;
  readonly groupModalSubmit: Locator;

  constructor(page: Page) {
    this.page = page;

    // Splits
    this.splitsHeading = page.getByRole("heading", { name: /splits|rozliczenia/i });
    this.createSplitGroupButton = page.getByRole("button", { name: /new group|nowa grupa/i }).first();
    this.splitSearchInput = page.getByPlaceholder(/search|szukaj/i);
    this.splitsEmptyState = page.locator("div").filter({ hasText: /no split groups|brak grup/i }).first();

    // Scheduler
    this.schedulerRoot = page.getByRole("heading", { name: /event|wydarzen|no events/i }).first();
    this.createEventButton = page.getByRole("button", { name: /new event|nowe wydarzenie|dodaj/i }).first();

    // Group Modal
    this.groupModalTitle = page.getByRole("heading", { name: /new split group|nowa grupa/i });
    this.groupNameInput = page.getByPlaceholder(/group name|nazwa grupy/i);
    this.groupModalSubmit = page.locator("div[role='dialog']").getByRole("button", { name: /save|create|utwórz|zapisz/i });
  }

  async gotoSplits() {
    await this.page.goto("/planning/splits");
    await this.page.locator("text=Loading...").waitFor({ state: "detached" }).catch(() => {});
  }

  async gotoScheduler() {
    await this.page.goto("/planning/scheduling");
    await this.page.locator("text=Loading...").waitFor({ state: "detached" }).catch(() => {});
  }
}
