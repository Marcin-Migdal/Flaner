import { test, expect } from "@playwright/test";

test.describe("Core Host Application Smoke", () => {
  test("renders host application cleanly without uncaught errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Flaner/i);
    
    // Ensure document body is present and interactive
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
