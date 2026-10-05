import { test, expect } from "@playwright/test";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Shopping Module E2E", () => {
  test("redirects unauthenticated user from /shopping to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep shopping route to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/shopping/lists");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });
});
