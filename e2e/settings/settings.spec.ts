import { test, expect } from "@playwright/test";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { SettingsPage } from "../support/pages/Settings.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Settings Module E2E", () => {
  test("redirects unauthenticated user from /settings to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/settings");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test.describe("Authenticated Settings Journeys", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "SettingsTester" });
    });

    test("renders profile settings with prefilled username and controls", async ({ page }) => {
      const settings = new SettingsPage(page);
      await settings.goto();

      await expect(settings.usernameInput).toBeVisible();
      await expect(settings.usernameInput).toHaveValue("SettingsTester");
      await expect(settings.saveButton).toBeVisible();
      await expect(settings.darkModeSwitch).toBeVisible();
    });

    test("allows modifying username input field", async ({ page }) => {
      const settings = new SettingsPage(page);
      await settings.goto();

      await settings.usernameInput.fill("NewSettingsName");
      await expect(settings.usernameInput).toHaveValue("NewSettingsName");
    });
  });
});
