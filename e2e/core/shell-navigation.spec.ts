import { test, expect } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { AppShellPage } from "../support/pages/AppShell.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Core Host Shell & Navigation E2E", () => {
  let shell: AppShellPage;

  test.beforeEach(async ({ page }) => {
    shell = new AppShellPage(page, await signInAsNewUser(page, { username: "Tester User", darkMode: true }));
  });

  test("renders shell layout with authenticated user and sidebar navigation", async () => {
    await shell.goto("/");

    // Verify main shell container and branding
    await expect(shell.logo).toBeVisible();
    await expect(shell.navLink("Home")).toBeVisible();

    // Verify user profile button renders in sidebar footer
    await expect(shell.userMenuButton).toBeVisible();
    await expect(shell.userMenuButton).toContainText("Tester User");
  });

  test("toggles theme dynamically across document", async () => {
    await shell.goto("/");

    // Default mock is dark mode: verify dark class on html
    const html = shell.documentRoot;
    await expect(html).toHaveClass(/dark/);

    // Switch to light theme
    await shell.switchTheme("light");
    await expect(html).not.toHaveClass(/dark/);

    // Switch back to dark theme
    await shell.switchTheme("dark");
    await expect(html).toHaveClass(/dark/);
  });

  test("signs out user cleanly and redirects to login", async ({ page }) => {
    await shell.goto("/");

    // Trigger Sign Out
    await shell.signOut();

    // Must redirect to /login and show authentication form
    await expect(page).toHaveURL(/\/login/);
    await expect(new LoginPage(page).heading).toBeVisible();
  });

  test("redirects unknown routes to home", async ({ page }) => {
    await page.goto("/unknown-non-existing-route-404");

    // Catch-all route in router redirects to /
    await expect(page).toHaveURL(/\/$/);
  });
});
