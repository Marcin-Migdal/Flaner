import { test, expect } from "@playwright/test";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Tools Module E2E", () => {
  test("redirects unauthenticated user from /tools to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/tools");
    await page.waitForLoadState("networkidle");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep tools route to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/tools/calculator");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });
});
