import { test, expect } from "@playwright/test";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Core Host Application Smoke", () => {
  test("renders host application cleanly and supports auth mode switching", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveTitle(/Flaner/i);

    // Root container & branding
    const root = page.locator("#root");
    await expect(root).toBeAttached();
    await expect(loginPage.heading).toBeVisible();

    // Default: Sign In form inputs & Google button
    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();

    // Toggle to Sign Up mode
    await loginPage.toggleAuthMode();

    // In Sign Up mode, username input should appear
    await expect(loginPage.usernameInput).toBeVisible();

    // Toggle back to Sign In mode
    await loginPage.toggleAuthMode();
    await expect(loginPage.usernameInput).not.toBeVisible();

    // No uncaught runtime page errors
    expect(pageErrors).toEqual([]);
  });
});
