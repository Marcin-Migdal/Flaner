import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedNotification, type E2EUser } from "../support/helpers/emulator";
import { AppShellPage } from "../support/pages/AppShell.page";

// #37: notifications that arrive while the app is open pop up as clickable toasts

test.describe("Notification toasts", () => {
  let user: E2EUser;
  let sender: E2EUser;
  let shell: AppShellPage;

  test.beforeEach(async ({ page }) => {
    [user, sender] = await Promise.all([createUser(), createUser()]);
    await seedNotification(user, "existing", { type: "friend_request_accepted", sender });

    shell = new AppShellPage(page);
    await signIn(page, user);
    // The existing notification is counted: the listener is in sync, and it got no toast
    await expect(shell.notificationsButton).toContainText("1");
    await expect(shell.toasts).toHaveCount(0);
  });

  test("a new notification shows a toast that opens its target and marks it read", async ({ page }) => {
    await seedNotification(user, "incoming", { type: "friend_request", sender });

    const toast = shell.toasts.filter({ hasText: sender.username });
    await expect(toast).toBeVisible();
    await expect(shell.notificationsButton).toContainText("2");

    await toast.getByText(sender.username).click();

    await expect(page).toHaveURL(/\/community\/friends/);
    await expect(toast).toHaveCount(0);
    await expect(shell.notificationsButton).toContainText("1");
  });

  test("a dismissed toast leaves the notification unread", async () => {
    await seedNotification(user, "incoming", { type: "friend_request", sender });

    const toast = shell.toasts.filter({ hasText: sender.username });
    await toast.getByRole("button", { name: /dismiss/i }).click();

    await expect(toast).toHaveCount(0);
    await expect(shell.notificationsButton).toContainText("2");
  });

  // #86: targets come from the MFE that owns the type (`./notificationTargets`), not from core
  test("a toast of another MFE opens that MFE's page", async ({ page }) => {
    await seedNotification(user, "event_invitation_e-1", { type: "event_invitation", sender, eventId: "e-1" });

    await shell.toasts.filter({ hasText: sender.username }).getByText(sender.username).click();

    await expect(page).toHaveURL(/\/planning\/scheduling#e-1$/);
  });

  test("a rejected friend request in the popover opens the friends page", async ({ page }) => {
    await seedNotification(user, "rejected", { type: "friend_request_rejected", sender });
    await expect(shell.notificationsButton).toContainText("2");

    await shell.notificationsButton.click();
    await page.getByRole("dialog").getByRole("button").filter({ hasText: /declined your friend request|odrzucił\(a\) twoje zaproszenie/i }).click();

    await expect(page).toHaveURL(/\/community\/friends$/);
  });
});
