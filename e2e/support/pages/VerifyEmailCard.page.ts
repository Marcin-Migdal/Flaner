import { type Locator, type Page } from "@playwright/test";

/** The card on `/login` that keeps an unverified email account out of the app until it confirms. */
export class VerifyEmailCard {
  readonly page: Page;
  /** The alert naming the address the link went to. */
  readonly card: Locator;
  readonly confirmButton: Locator;
  readonly useAnotherAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.card = page.getByRole("alert").filter({ hasText: /confirm your email|potwierdź swój adres email/i });
    this.confirmButton = page.getByRole("button", { name: /^(i've confirmed|już potwierdziłem)$/i });
    this.useAnotherAccountButton = page.getByRole("button", { name: /^(use a different account|użyj innego konta)$/i });
  }

  /** "I've confirmed": lets the user in once the email is verified, otherwise the card stays. */
  async confirm() {
    await this.confirmButton.click();
  }

  /** Signs the unverified account out, back to the login form. */
  async useAnotherAccount() {
    await this.useAnotherAccountButton.click();
  }
}
