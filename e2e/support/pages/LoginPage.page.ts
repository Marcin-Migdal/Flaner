import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly usernameInput: Locator;
  readonly googleButton: Locator;
  readonly emailFieldError: Locator;
  readonly passwordFieldError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "FLANER" });
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.usernameInput = page.getByLabel(/username/i);
    this.googleButton = page.getByRole("button", { name: /continue with google/i });

    const emailField = page.locator("[data-slot='field']").filter({ hasText: /email/i });
    this.emailFieldError = emailField.locator("[data-slot='field-error']");

    const passwordField = page.locator("[data-slot='field']").filter({ hasText: /password/i });
    this.passwordFieldError = passwordField.locator("[data-slot='field-error']");
  }

  async goto(path = "/login") {
    await this.page.addInitScript(() => {
      localStorage.removeItem("flaner_e2e_user");
    });
    await this.page.goto(path);
  }

  get submitButton(): Locator {
    return this.page.locator("form button[type='submit']");
  }

  get toggleModeButton(): Locator {
    return this.page.locator("div.text-center button[type='button']");
  }

  async toggleAuthMode() {
    await this.toggleModeButton.click();
  }

  async fillCredentials(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
  }

  async fillSignUpCredentials(email: string, pass: string, username: string) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
  }

  async submit() {
    await this.submitButton.click();
  }
}
