import { expect, test } from "@playwright/test";

test.describe("SignIn", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load app sign in page", async ({ page }) => {
    await expect(page.getByTestId("sign-in-content")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("should be able to sign in and sign out", async ({ page }) => {
    await page.locator('input[name="email"]').fill("flanertestuser@gmail.com");
    await page.locator('input[name="password"]').fill("Flanertestuser13@");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByTestId("homepage")).toBeVisible();

    await page.getByRole("listitem").last().hover();
    await page.getByText("Sign out").click();
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByTestId("sign-in-content")).toBeVisible();
  });
});
