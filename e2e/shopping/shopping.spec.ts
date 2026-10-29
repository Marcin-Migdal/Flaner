import { test, expect } from "@playwright/test";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Shopping Module E2E", () => {
  test("redirects unauthenticated user from /shopping to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/shopping");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep shopping route to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/shopping/lists");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });

  test.describe("Authenticated Shopping Module", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "Shopping Tester" });
    });

    test("renders shopping container cleanly when authenticated", async ({ page }) => {
      await page.goto("/shopping/lists");

      // Verify MFE mounted cleanly
      await expect(page.locator("[data-testid='shopping']")).toBeVisible();
    });
  });
});
