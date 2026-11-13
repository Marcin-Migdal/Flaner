import { type Locator, type Page } from "@playwright/test";

const SIGN_IN = /^(sign in|zaloguj się)$/i;
const SIGN_UP = /^(sign up|zarejestruj się)$/i;

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly usernameInput: Locator;
  readonly googleButton: Locator;
  readonly emailFieldError: Locator;
  readonly passwordFieldError: Locator;
  /** The form submits with the current mode's label; the other mode's label is the toggle below it. */
  private mode: "signIn" | "signUp" = "signIn";

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "FLANER" });
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.usernameInput = page.getByLabel(/username/i);
    this.googleButton = page.getByRole("button", { name: /continue with google/i });
    this.emailFieldError = page.getByRole("group").filter({ has: this.emailInput }).getByRole("alert");
    this.passwordFieldError = page.getByRole("group").filter({ has: this.passwordInput }).getByRole("alert");
  }

  async goto(path = "/login") {
    await this.page.goto(path);
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: this.mode === "signIn" ? SIGN_IN : SIGN_UP });
  }

  async toggleAuthMode() {
    await this.page.getByRole("button", { name: this.mode === "signIn" ? SIGN_UP : SIGN_IN }).click();
    this.mode = this.mode === "signIn" ? "signUp" : "signIn";
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

  /** Signs up through the form; an email account then waits on the verification card. */
  async signUp(email: string, pass: string, username: string) {
    await this.goto();
    await this.toggleAuthMode();
    await this.fillSignUpCredentials(email, pass, username);
    await this.submit();
  }

  /** Signs in through the form (does not wait for the redirect). */
  async signIn(email: string, pass: string) {
    await this.goto();
    await this.fillCredentials(email, pass);
    await this.submit();
  }
}
