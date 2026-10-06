import { test, expect } from "@playwright/test";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { ToolsPage } from "../support/pages/Tools.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Tools Module E2E", () => {
  test("redirects unauthenticated user from /tools to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/tools");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep tools route to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/tools/spooler");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });

  test.describe("Authenticated Tools Journeys", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "Maker Tools" });
    });

    test("renders spooler view with tabs and header", async ({ page }) => {
      const tools = new ToolsPage(page);
      await tools.goto();

      await expect(tools.heading).toBeVisible();
      await expect(tools.spoolsTab).toBeVisible();
      await expect(tools.templatesTab).toBeVisible();
      await expect(tools.settingsButton).toBeVisible();
    });

    test("switches between spools and templates tabs cleanly", async ({ page }) => {
      const tools = new ToolsPage(page);
      await tools.goto();

      // Click Templates tab
      await tools.templatesTab.click();
      await expect(tools.templatesTab).toHaveAttribute("data-state", "active");

      // Click Spools tab back
      await tools.spoolsTab.click();
      await expect(tools.spoolsTab).toHaveAttribute("data-state", "active");
    });
  });
});
