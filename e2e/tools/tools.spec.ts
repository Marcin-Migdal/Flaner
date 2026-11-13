import { test, expect } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { seedLookupMaterial, seedSpool, seedTemplate, type E2EUser } from "../support/helpers/emulator";
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
    let user: E2EUser;

    test.beforeEach(async ({ page }) => {
      user = await signInAsNewUser(page, { username: "Maker Tools" });
    });

    test("records a print and undoes it; undo is disabled without prints", async ({ page }) => {
      const spoolName = "E2E Print Spool";
      await seedSpool(user, { name: spoolName, initialWeight: 1000 });
      const tools = new ToolsPage(page);
      await tools.goto();

      const card = tools.spoolCard(spoolName);
      await expect(card).toContainText("1000g");
      await expect(tools.undoButton(spoolName)).toBeDisabled();

      // Default startup waste: 1.5 g on top of the model weight
      await tools.recordPrint(spoolName, 10);
      await expect(tools.loadError).toHaveCount(0);
      await expect(card).toContainText("988.5g");
      await expect(tools.undoButton(spoolName)).toBeEnabled();

      await tools.undoLastPrint(spoolName);
      await expect(card).not.toContainText("988.5g");
      await expect(card).toContainText("1000g");
      await expect(tools.undoButton(spoolName)).toBeDisabled();
    });

    test("a print that empties a spool offers the next spool with the carryover already taken", async ({ page }) => {
      const spoolName = "E2E Run-out Spool";
      const template = await seedTemplate(user, { defaultWeight: 1000 });
      await seedSpool(user, { name: spoolName, template, initialWeight: 1000, currentWeight: 10 });
      const tools = new ToolsPage(page);
      await tools.goto();

      // 20 g + 1.5 g startup waste on a 10 g spool: 11.5 g runs over to the next spool
      await tools.recordPrint(spoolName, 20);
      const form = await tools.acceptRunOutClone();
      await expect(tools.spoolFormCurrentWeight(form)).toHaveValue("988.5");
      await tools.submitSpoolForm(form);

      await expect(tools.spoolCard(spoolName)).toContainText("988.5g");
      await expect(tools.finishedSpool(spoolName)).toBeVisible();
    });

    test("a deleted custom material stays deleted after a reload, even when a template uses it", async ({ page }) => {
      const material = "E2E Nylon";
      await seedTemplate(user, { material, type: "CF", colorName: "Snow", colorHex: "#ffffff", defaultWeight: 750 });
      await seedLookupMaterial(user, material);
      const tools = new ToolsPage(page);
      await tools.goto();

      const dialog = await tools.openAddTemplate();
      await tools.openMaterialSelect(dialog);
      await tools.deleteCustomMaterial(material);
      // The list refreshes once the delete is stored
      await tools.openMaterialSelect(dialog);
      await expect(tools.materialOption("PLA")).toBeVisible();
      await expect(tools.materialOption(material)).toHaveCount(0);

      // A fresh page load: the template form used to re-create lookups from templates on every mount
      await tools.goto();
      const reopened = await tools.openAddTemplate();
      await tools.openMaterialSelect(reopened);
      await expect(tools.materialOption("PLA")).toBeVisible();
      await expect(tools.materialOption(material)).toHaveCount(0);
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
      await expect(tools.templatesTab).toHaveAttribute("aria-selected", "true");

      // Click Spools tab back
      await tools.spoolsTab.click();
      await expect(tools.spoolsTab).toHaveAttribute("aria-selected", "true");
    });
  });
});
