import { test, expect } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { seedDocument } from "../support/helpers/emulator";
import { ToolsPage } from "../support/pages/Tools.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Tools Module E2E", () => {
  test("redirects unauthenticated user from /tools to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/tools");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("redirects unauthenticated user from deep tools route to /login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/tools/spooler");

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
  });

  test.describe("Authenticated Tools Journeys", () => {
    let userId = "";

    test.beforeEach(async ({ page }) => {
      ({ uid: userId } = await signInAsNewUser(page, { username: "Maker Tools" }));
    });

    test("records a print and undoes it; undo is disabled without prints", async ({ page }) => {
      const spoolName = "E2E Print Spool";
      await seedDocument(`spools/spool-${userId}`, {
        id: `spool-${userId}`,
        userId,
        templateId: null,
        name: spoolName,
        initialWeight: 1000,
        currentWeight: 1000,
        isFinished: false,
        finishedAt: null,
        material: "PLA",
        type: "Basic",
        colorName: "Black",
        colorHex: "#000000",
      });
      const tools = new ToolsPage(page);
      await tools.goto();

      const card = tools.spoolCard(spoolName);
      await expect(card).toContainText("1000g");
      await expect(tools.undoButton(spoolName)).toBeDisabled();

      // Default startup waste: 1.5 g on top of the model weight
      await tools.recordPrint(spoolName, 10);
      await expect(page.getByText(/failed to load/i)).toHaveCount(0);
      await expect(card).toContainText("988.5g");
      await expect(tools.undoButton(spoolName)).toBeEnabled();

      await tools.undoLastPrint(spoolName);
      await expect(card).not.toContainText("988.5g");
      await expect(card).toContainText("1000g");
      await expect(tools.undoButton(spoolName)).toBeDisabled();
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
