import { expect, test } from "@playwright/test";
import { createUser, getVerificationLink, openVerificationLink, uniqueId } from "../support/helpers/emulator";
import { LoginPage } from "../support/pages/LoginPage.page";
import { VerifyEmailCard } from "../support/pages/VerifyEmailCard.page";

// #38: email/password accounts get into the app only after verifying their email

test.describe("Email verification", () => {
  test("sign-up shows the verification card until the emailed link is opened", async ({ page }) => {
    const username = uniqueId("e2e");
    const email = `${username}@flaner.test`;
    await new LoginPage(page).signUp(email, "e2e-password", username);

    const verification = new VerifyEmailCard(page);
    await expect(verification.card).toContainText(email);
    await expect(page).toHaveURL(/\/login$/);

    // Still kept out after a reload / direct navigation
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(verification.card).toContainText(email);

    // Not verified yet: the confirm button keeps the card
    await verification.confirm();
    await expect(verification.card).toBeVisible();

    await openVerificationLink(email);
    await verification.confirm();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("an unverified account stays on the login page without a new email, and can switch accounts", async ({ page }) => {
    const user = await createUser({}, { emailVerified: false });
    const loginPage = new LoginPage(page);
    await loginPage.signIn(user.email, user.password);

    const verification = new VerifyEmailCard(page);
    await expect(verification.card).toContainText(user.email);
    expect(await getVerificationLink(user.email)).toBeUndefined();

    await verification.useAnotherAccount();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(verification.card).toHaveCount(0);
  });
});
