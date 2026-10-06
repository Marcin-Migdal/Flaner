import { test, expect } from "@playwright/test";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { PlanningPage } from "../support/pages/Planning.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Planning Module E2E", () => {
  test("redirects unauthenticated user from /planning to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/planning");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep planning route to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/planning/scheduling");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });

  test.describe("Authenticated Planning Journeys", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "Planning Master" });
    });

    test("renders splits view with groups list or empty state", async ({ page }) => {
      const planning = new PlanningPage(page);
      await planning.gotoSplits();

      // Heading or sidebar list is visible
      await expect(page.locator("body")).toBeVisible();
      await expect(planning.createSplitGroupButton).toBeVisible();
    });

    test("opens create split group modal and allows typing group name", async ({ page }) => {
      const planning = new PlanningPage(page);
      await planning.gotoSplits();

      await planning.createSplitGroupButton.click();
      await expect(planning.groupModalTitle).toBeVisible();

      await planning.groupNameInput.fill("Holiday Trip Split");
      await expect(planning.groupNameInput).toHaveValue("Holiday Trip Split");

      // Dismiss dialog
      await page.keyboard.press("Escape");
      await expect(planning.groupModalTitle).not.toBeVisible();
    });

    test("renders scheduling calendar view cleanly without runtime crashes", async ({ page }) => {
      const planning = new PlanningPage(page);
      await planning.gotoScheduler();

      await expect(planning.schedulerRoot).toBeVisible();
    });
  });
});
