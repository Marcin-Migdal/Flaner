import { test, expect } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { createUser, readDocumentFields } from "../support/helpers/emulator";
import { SettingsPage } from "../support/pages/Settings.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Settings Module E2E", () => {
  test("redirects unauthenticated user from /settings to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/settings");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test.describe("Authenticated Settings Journeys", () => {
    test.beforeEach(async ({ page }) => {
      await signInAsNewUser(page, { username: "SettingsTester" });
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

  // #84: the username change goes through the shared profile module (reserve new + release old in one batch)
  test.describe("Username change", () => {
    const uniqueName = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    test("saves a new username and moves its reservation", async ({ page }) => {
      const user = await signInAsNewUser(page, { username: uniqueName("before") });
      const newName = uniqueName("After");
      const settings = new SettingsPage(page);
      await settings.goto();

      await settings.usernameInput.fill(newName);
      await settings.saveButton.click();
      await expect(page.getByText(/settings updated successfully|zostały pomyślnie zaktualizowane/i)).toBeVisible();

      await expect
        .poll(async () => (await readDocumentFields(`users/${user.uid}`)).usernameLower)
        .toEqual({ stringValue: newName.toLowerCase() });
      expect((await readDocumentFields(`usernames/${newName.toLowerCase()}`)).uid).toEqual({ stringValue: user.uid });
      // The old reservation is released: the emulator answers 404
      await expect(readDocumentFields(`usernames/${user.usernameLower}`)).rejects.toThrow(/404/);

      await page.reload();
      await expect(settings.usernameInput).toHaveValue(newName);
    });

    test("rejects a username reserved by another user", async ({ page }) => {
      const other = await createUser({ username: uniqueName("Taken") });
      const user = await signInAsNewUser(page, { username: uniqueName("owner") });
      const settings = new SettingsPage(page);
      await settings.goto();

      await settings.usernameInput.fill(other.username.toUpperCase());
      await settings.saveButton.click();

      await expect(page.getByText(/this username is already taken|zajęta/i)).toBeVisible();
      expect((await readDocumentFields(`users/${user.uid}`)).username).toEqual({ stringValue: user.username });
    });
  });
});
