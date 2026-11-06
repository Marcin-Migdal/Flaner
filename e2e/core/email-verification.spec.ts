import { expect, test } from "@playwright/test";
import { createUser, getVerificationLink } from "../support/helpers/emulator";
import { LoginPage } from "../support/pages/LoginPage.page";

// #38: email/password accounts get into the app only after verifying their email

test.describe("Email verification", () => {
  test("sign-up shows the verification card until the emailed link is opened", async ({ page }) => {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const email = `${suffix}@flaner.test`;
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.toggleAuthMode();
    await loginPage.fillSignUpCredentials(email, "e2e-password", `e2e-${suffix}`);
    await loginPage.submit();

    const card = page.locator("[data-slot='alert']");
    await expect(card).toContainText(email);
    await expect(page).toHaveURL(/\/login$/);

    // Still kept out after a reload / direct navigation
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(card).toContainText(email);

    // Not verified yet: the confirm button keeps the card
    await page.getByRole("button", { name: /i've confirmed/i }).click();
    await expect(card).toBeVisible();

    const link = await getVerificationLink(email);
    expect(link).toBeDefined();
    await fetch(link ?? "", { redirect: "manual" });

    await page.getByRole("button", { name: /i've confirmed/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("an unverified account stays on the login page without a new email, and can switch accounts", async ({ page }) => {
    const user = await createUser({}, { emailVerified: false });
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillCredentials(user.email, user.password);
    await loginPage.submit();

    await expect(page.locator("[data-slot='alert']")).toContainText(user.email);
    expect(await getVerificationLink(user.email)).toBeUndefined();

    await page.getByRole("button", { name: /use a different account/i }).click();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page.locator("[data-slot='alert']")).toHaveCount(0);
  });
});
