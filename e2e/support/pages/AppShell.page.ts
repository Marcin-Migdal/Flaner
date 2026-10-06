import { type Page, type Locator } from "@playwright/test";

export class AppShellPage {
  readonly page: Page;
  readonly mainNav: Locator;
  readonly bottomNav: Locator;
  readonly logo: Locator;
  readonly userMenuButton: Locator;
  readonly mobileSidebarTrigger: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainNav = page.locator("[data-sidebar='sidebar'], nav");
    this.bottomNav = page.locator("nav.fixed.bottom-0, nav[aria-label='Mobile Navigation']");
    this.logo = page.locator("header, [data-sidebar='header']").getByRole("link", { name: /flaner/i });
    this.userMenuButton = page.locator("[data-sidebar='footer'] button").last();
    this.mobileSidebarTrigger = page.locator("header button").first();
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }

  getNavLink(name: string | RegExp): Locator {
    return this.page.locator("[data-sidebar='content']").getByRole("link", { name });
  }

  async openUserMenu() {
    await this.userMenuButton.click();
    await this.page.locator("[data-slot='dropdown-menu-content']").waitFor({ state: "visible" });
  }

  get signOutButton(): Locator {
    return this.page.locator("[data-slot='dropdown-menu-item']").filter({ hasText: /sign out|wyloguj/i });
  }

  get themeMenuTrigger(): Locator {
    return this.page.locator("[data-slot='dropdown-menu-sub-trigger']").filter({ hasText: /theme|motyw/i });
  }

  get languageMenuTrigger(): Locator {
    return this.page.locator("[data-slot='dropdown-menu-sub-trigger']").filter({ hasText: /language|język/i });
  }

  get settingsOption(): Locator {
    return this.page.locator("[data-slot='dropdown-menu-item']").filter({ hasText: /settings|ustawienia/i });
  }

  async switchTheme(theme: "light" | "dark") {
    await this.openUserMenu();
    await this.themeMenuTrigger.click();
    const subContent = this.page.locator("[data-slot='dropdown-menu-sub-content']");
    await subContent.waitFor({ state: "visible" });
    const optionName = theme === "light" ? /light|jasny/i : /dark|ciemny/i;
    await subContent.locator("[data-slot='dropdown-menu-item']").filter({ hasText: optionName }).click();
    await this.page.locator("[data-slot='dropdown-menu-content']").waitFor({ state: "hidden" });
  }

  async switchLanguage(lang: "pl" | "en") {
    await this.openUserMenu();
    await this.languageMenuTrigger.click();
    const subContent = this.page.locator("[data-slot='dropdown-menu-sub-content']");
    await subContent.waitFor({ state: "visible" });
    const optionName = lang === "pl" ? /polski/i : /english/i;
    await subContent.locator("[data-slot='dropdown-menu-item']").filter({ hasText: optionName }).click();
    await this.page.locator("[data-slot='dropdown-menu-content']").waitFor({ state: "hidden" });
  }

  async signOut() {
    await this.openUserMenu();
    await this.signOutButton.click();
    await this.page.waitForURL(/\/login/);
  }
}
