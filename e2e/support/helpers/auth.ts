import { expect, type Page } from "@playwright/test";
import { type UserType } from "../../../packages/shared/src/types";
import { LoginPage } from "../pages/LoginPage.page";
import { createUser, type E2EUser } from "./emulator";

/** Signs an existing emulator user in through the real email/password login form. */
export async function signIn(page: Page, user: E2EUser): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.fillCredentials(user.email, user.password);
  await loginPage.submit();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Creates a fresh emulator user and signs them in. Every call gets a unique account. */
export async function signInAsNewUser(page: Page, overrides: Partial<UserType> = {}): Promise<E2EUser> {
  const user = await createUser(overrides);
  await signIn(page, user);
  return user;
}
