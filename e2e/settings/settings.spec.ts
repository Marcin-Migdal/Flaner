import { test, expect } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import type { UsernameReservation } from "../../packages/shared/src/api/users/types";
import type { UserProfile } from "../../packages/shared/src/types";
import { createUser, readDocument } from "../support/helpers/emulator";
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

      await settings.changeUsername(newName);
      await expect(settings.savedMessage).toBeVisible();

      await expect
        .poll(() => readDocument(`users/${user.uid}`))
        .toMatchObject({ username: newName, usernameLower: newName.toLowerCase() } satisfies Partial<UserProfile>);
      expect(await readDocument(`usernames/${newName.toLowerCase()}`)).toEqual({ uid: user.uid } satisfies UsernameReservation);
      // The old reservation is released
      expect(await readDocument(`usernames/${user.usernameLower}`)).toBeUndefined();

      await page.reload();
      await expect(settings.usernameInput).toHaveValue(newName);
    });

    test("rejects a username reserved by another user", async ({ page }) => {
      const other = await createUser({ username: uniqueName("Taken") });
      const user = await signInAsNewUser(page, { username: uniqueName("owner") });
      const settings = new SettingsPage(page);
      await settings.goto();

      await settings.changeUsername(other.username.toUpperCase());

      await expect(settings.usernameTakenError).toBeVisible();
      expect(await readDocument(`users/${user.uid}`)).toMatchObject({ username: user.username } satisfies Partial<UserProfile>);
    });
  });
});
