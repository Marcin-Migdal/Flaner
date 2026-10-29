import { type Page } from "@playwright/test";
import { type UserType } from "../../../packages/shared/src/types";

export const DEFAULT_E2E_USER: UserType = {
  uid: "e2e-test-user-uid",
  username: "E2E Tester",
  usernameLower: "e2e tester",
  email: "e2e@flaner.test",
  avatarUrl: "",
  darkMode: true,
  language: "en",
};

/**
 * Injects a mock authenticated user into localStorage prior to navigation,
 * effectively bypassing Firebase Auth in DEV mode for deterministic testing.
 */
export async function loginAsMockUser(page: Page, user: Partial<UserType> = {}): Promise<UserType> {
  const mergedUser: UserType = {
    ...DEFAULT_E2E_USER,
    ...user,
  };

  await page.addInitScript((mockUser) => {
    localStorage.setItem("flaner_e2e_user", JSON.stringify(mockUser));
  }, mergedUser);

  return mergedUser;
}

/**
 * Clears the mock user from the browser context before scripts run.
 */
export async function ensureUnauthenticated(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem("flaner_e2e_user");
  });
}

/**
 * Clears the mock user from the browser context.
 */
export async function clearMockUser(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("flaner_e2e_user");
  });
}
