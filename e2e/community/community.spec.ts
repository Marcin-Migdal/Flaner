import { test, expect } from "@playwright/test";
import { ensureUnauthenticated, loginAsMockUser } from "../support/helpers/auth";
import { CommunityPage } from "../support/pages/Community.page";
import { LoginPage } from "../support/pages/LoginPage.page";

test.describe("Community Module E2E", () => {
  test("redirects unauthenticated user from /community to /login", async ({ page }) => {
    await ensureUnauthenticated(page);
    const loginPage = new LoginPage(page);
    await page.goto("/community");

    // Route guard must redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();
  });

  test.describe("Authenticated Community Journeys", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMockUser(page, { username: "Community Explorer" });
    });

    test("renders groups list view with search, filters and controls", async ({ page }) => {
      const community = new CommunityPage(page);
      await community.goto();

      await expect(community.heading).toBeVisible();
      await expect(community.filterTriggerButton).toBeVisible();
      await expect(community.searchTriggerButton).toBeVisible();
      await expect(community.createGroupButton).toBeVisible();
    });

    test("opens create group modal, fills details and allows cancellation", async ({ page }) => {
      const community = new CommunityPage(page);
      await community.goto();

      // Open Modal
      await community.openCreateModal();
      await expect(community.modalTitle).toBeVisible();

      // Fill form fields
      await community.fillGroupForm("My Awesome E2E Test Group", "Description for test group");
      await expect(community.groupNameInput).toHaveValue("My Awesome E2E Test Group");

      // Cancel modal
      await community.cancelGroupModal();
      await expect(community.modalTitle).not.toBeVisible();
    });

    test("supports expanding search bar and typing search query", async ({ page }) => {
      const community = new CommunityPage(page);
      await community.goto();

      // Click search trigger button to expand search input
      await community.searchTriggerButton.click();
      const searchInput = page.getByPlaceholder(/search groups|szukaj grup/i);
      await expect(searchInput).toBeVisible();

      await searchInput.fill("Global Search");
      await expect(searchInput).toHaveValue("Global Search");
    });
  });
});
