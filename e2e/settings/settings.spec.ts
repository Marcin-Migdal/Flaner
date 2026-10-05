import { test, expect } from "@playwright/test";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Settings Module E2E", () => {
  test("redirects unauthenticated user from /settings to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });
});
