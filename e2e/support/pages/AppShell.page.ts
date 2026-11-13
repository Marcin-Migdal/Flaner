import { expect, type Locator, type Page } from "@playwright/test";
import type { E2EUser } from "../helpers/emulator";

/** The host's shell: sidebar navigation, user menu, notifications and toasts (the signed-in `user`'s view). */
export class AppShellPage {
  readonly page: Page;
  readonly logo: Locator;
  /** The mobile header (hidden from `md` up). */
  readonly header: Locator;
  readonly sidebarTrigger: Locator;
  readonly userMenuButton: Locator;
  /** Sidebar notifications trigger; its name includes the unread count. */
  readonly notificationsButton: Locator;
  readonly toasts: Locator;

  constructor(page: Page, user: Pick<E2EUser, "username">) {
    this.page = page;
    this.logo = page.getByRole("link", { name: "FLANER", exact: true });
    this.header = page.getByRole("banner");
    this.sidebarTrigger = page.getByRole("button", { name: /^toggle sidebar$/i }).filter({ visible: true });
    // Its name is the avatar's initials followed by the username
    this.userMenuButton = page.getByRole("button", { name: user.username });
    this.notificationsButton = page.getByRole("button", { name: /^(notifications|powiadomienia)/i });
    this.toasts = page.getByRole("region", { name: /^notifications/i }).getByRole("listitem");
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }

  /** A sidebar link by its exact label. */
  navLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  /** The document theme: the app toggles `dark` on `<html>`. */
  get documentRoot(): Locator {
    return this.page.locator("html");
  }

  toast(text: string): Locator {
    return this.toasts.filter({ hasText: text });
  }

  /** Clicks a toast's content, which opens the notification's target. */
  async openToast(text: string) {
    await this.toast(text).getByRole("button", { name: text }).click();
  }

  async dismissToast(text: string) {
    await this.toast(text).getByRole("button", { name: /^dismiss$/i }).click();
  }

  /** Opens the notifications popover and clicks the notification whose text matches `text`. */
  async openNotification(text: RegExp) {
    await this.notificationsButton.click();
    await this.page.getByRole("dialog").getByRole("button", { name: text }).click();
  }

  private async chooseFromUserMenu(submenu: RegExp, option: RegExp) {
    await this.userMenuButton.click();
    await this.page.getByRole("menuitem", { name: submenu }).click();
    await this.page.getByRole("menu", { name: submenu }).getByRole("menuitem", { name: option }).click();
    await expect(this.page.getByRole("menu")).toHaveCount(0);
  }

  async switchTheme(theme: "light" | "dark") {
    await this.chooseFromUserMenu(/^(theme|motyw)$/i, theme === "light" ? /^(light|jasny)$/i : /^(dark|ciemny)$/i);
  }

  async signOut() {
    await this.userMenuButton.click();
    await this.page.getByRole("menuitem", { name: /^(sign out|wyloguj)/i }).click();
    await this.page.waitForURL(/\/login/);
  }
}
