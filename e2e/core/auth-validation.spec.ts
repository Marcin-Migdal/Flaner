import { test, expect } from "@playwright/test";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Core Authentication Validation", () => {
  test("displays validation errors when submitting empty credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click Sign In button without entering email or password
    await loginPage.submit();

    // Verify field validation errors are displayed
    await expect(loginPage.emailFieldError).toBeVisible();
    await expect(loginPage.passwordFieldError).toBeVisible();
  });

  test("flags invalid email format via input validity", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.emailInput.fill("invalid-email-format");

    // Browser constraint validation flags email format as invalid
    const isInvalid = await loginPage.emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });
});
