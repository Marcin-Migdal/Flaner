import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "../support/helpers/viewport";
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
    const routesToTest = ["/community", "/planning", "/settings", "/shopping", "/tools"];

    for (const route of routesToTest) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/login/);
      await expectNoHorizontalScroll(page);
    }
  });
});
