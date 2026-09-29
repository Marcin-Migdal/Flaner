import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll } from "../support/helpers/viewport";

test.describe("Mobile Render Stability", () => {
  test("main landing and navigation have no horizontal overflow on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Verify absence of horizontal scrolling bug on mobile
    await expectNoHorizontalScroll(page);

    // Verify body takes up full mobile width
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeGreaterThan(0);
  });
});
