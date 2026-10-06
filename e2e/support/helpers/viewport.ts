import { type Page, expect } from "@playwright/test";

/**
 * Asserts that the page does not exhibit horizontal scrolling / viewport overflow on mobile.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(isOverflowing).toBe(false);
}
