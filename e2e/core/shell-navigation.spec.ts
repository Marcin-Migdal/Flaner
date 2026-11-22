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

  test("reaches a Budget view through the three-level sidebar and keeps its tab on refresh", async ({ page }) => {
    await shell.goto("/");

    // Level 1 → level 2: Planning expands to show Budget, which has its own chevron
    await shell.navToggle("Planning").click();
    await expect(shell.navToggle("Budget")).toHaveAttribute("aria-expanded", "false");
    await shell.navLink("Budget").click();

    // /planning/budget is a tiles page of the four Budget views
    await expect(page).toHaveURL(/\/planning\/budget$/);
    await expect(page.getByRole("heading", { level: 1, name: "Budget" })).toBeVisible();
    for (const view of ["Summary", "Transactions", "Planner", "Settings"]) {
      await expect(page.getByRole("main").getByRole("button", { name: view, exact: true })).toBeVisible();
    }

    // Level 3 from the sidebar; Budget stays highlighted on its views
    await shell.navLink("Transactions").click();
    await expect(page).toHaveURL(/\/planning\/budget\/transactions$/);
    await expect(shell.navLink("Transactions")).toHaveAttribute("data-active", "true");
    await expect(shell.navLink("Budget")).toHaveAttribute("data-active", "true");

    // The tab lives in the URL hash and survives a refresh
    await page.getByRole("tab", { name: "Recurring" }).click();
    await expect(page).toHaveURL(/#recurring$/);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Recurring" })).toHaveAttribute("aria-selected", "true");
  });

  test("redirects unknown routes to home", async ({ page }) => {
    // The client-side redirect starts a new navigation before "load", which aborts goto (#106)
    await page.goto("/unknown-non-existing-route-404", { waitUntil: "commit" });

    // Catch-all route in router redirects to /
    await expect(page).toHaveURL(/\/$/);
  });
});
