import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "../support/helpers/viewport";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Mobile Render Stability", () => {
  test("main landing and navigation have no horizontal overflow on mobile viewport", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify absence of horizontal scrolling bug on mobile
    await expectNoHorizontalScroll(page);

    // Verify heading is visible and body takes up mobile width
    await expect(loginPage.heading).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeGreaterThan(0);
  });

  test("sign-up expanded form maintains zero horizontal scroll on mobile", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Toggle to Sign Up mode
    await loginPage.toggleAuthMode();
    await expect(loginPage.usernameInput).toBeVisible();

    // Verify no horizontal overflow in expanded form
    await expectNoHorizontalScroll(page);
  });

  test("redirects from protected routes maintain responsive viewport stability", async ({ page }) => {
    await ensureUnauthenticated(page);
    const routesToTest = ["/community", "/planning", "/settings", "/shopping", "/tools"];

    for (const route of routesToTest) {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login/);
      await expectNoHorizontalScroll(page);
    }
  });

  test.describe("Authenticated Mobile Journeys & Drawers", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "Mobile Tester" });
    });

    test("authenticated views maintain zero horizontal scroll on mobile viewport", async ({ page }) => {
      const authenticatedRoutes = [
        "/",
        "/community/groups",
        "/planning/splits",
        "/planning/scheduling",
        "/tools/spooler",
        "/settings",
      ];

      for (const route of authenticatedRoutes) {
        await page.goto(route);

        await expectNoHorizontalScroll(page);
      }
    });

    test("mobile header renders hamburger trigger and toggles mobile drawer cleanly", async ({ page }) => {
      await page.goto("/");

      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Mobile trigger button
      const trigger = header.locator("button").first();
      await expect(trigger).toBeVisible();

      // Open mobile drawer
      await trigger.click();

      // Verify no horizontal overflow when drawer is open
      await expectNoHorizontalScroll(page);
    });
  });
});
