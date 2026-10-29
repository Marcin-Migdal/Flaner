import { test, expect } from "@playwright/test";
import { loginAsMockUser } from "../support/helpers/auth";
import { AppShellPage } from "../support/pages/AppShell.page";

test.describe("Core Host Shell & Navigation E2E", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMockUser(page, { username: "Tester User", darkMode: true });
  });

  test("renders shell layout with authenticated user and sidebar navigation", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto("/");

    // Verify main shell container and branding
    await expect(shell.logo).toBeVisible();
    await expect(shell.mainNav).toBeVisible();

    // Verify user profile button renders in sidebar footer
    await expect(shell.userMenuButton).toBeVisible();
    await expect(shell.userMenuButton).toContainText("Tester User");
  });

  test("toggles theme dynamically across document", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto("/");

    // Default mock is dark mode: verify dark class on html
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    // Switch to light theme
    await shell.switchTheme("light");
    await expect(html).not.toHaveClass(/dark/);

    // Switch back to dark theme
    await shell.switchTheme("dark");
    await expect(html).toHaveClass(/dark/);
  });

  test("signs out user cleanly and redirects to login", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto("/");

    // Trigger Sign Out
    await shell.signOut();

    // Must redirect to /login and show authentication form
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "FLANER" })).toBeVisible();
  });

  test("redirects unknown routes to home", async ({ page }) => {
    await page.goto("/unknown-non-existing-route-404");

    // Catch-all route in router redirects to /
    await expect(page).toHaveURL(/\/$/);
  });
});
