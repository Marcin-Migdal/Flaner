import { type Locator, type Page } from "@playwright/test";

export type BudgetOnboardingInput = { passphrase: string; accountName: string };

/** What a Budget page shows while locked: the onboarding wizard (first visit) or the unlock screen. */
export class BudgetGatePage {
  readonly page: Page;
  readonly onboardingHeading: Locator;
  readonly unlockHeading: Locator;
  readonly recoveryKey: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.onboardingHeading = main.getByRole("heading", { name: /^(set up your budget|skonfiguruj budżet)$/i });
    this.unlockHeading = main.getByRole("heading", { name: /^(unlock your budget|odblokuj budżet)$/i });
    // The key has no text role: its groups are hidden, the full key is the element's label
    this.recoveryKey = page.getByTestId("budget-recovery-key");
    this.continueButton = main.getByRole("button", { name: /^(continue|dalej)$/i });
  }

  /** Walks the four steps with the locale's default currencies; resolves with the shown recovery key. */
  async completeOnboarding({ passphrase, accountName }: BudgetOnboardingInput): Promise<string> {
    const main = this.page.getByRole("main");
    await main.getByLabel(/^(budget passphrase|hasło budżetu)$/i).fill(passphrase);
    await main.getByLabel(/^(repeat the passphrase|powtórz hasło)$/i).fill(passphrase);
    await this.continueButton.click();

    const recoveryKey = (await this.recoveryKey.getAttribute("aria-label")) ?? "";
    await main.getByRole("checkbox", { name: /recovery key|klucz odzyskiwania/i }).check();
    await this.continueButton.click();
    await this.continueButton.click(); // main currency: locale default

    await main.getByLabel(/^(account name|nazwa konta)$/i).fill(accountName);
    await main.getByRole("button", { name: /^(finish setup|zakończ konfigurację)$/i }).click();
    return recoveryKey;
  }

  async unlock(passphrase: string) {
    const main = this.page.getByRole("main");
    await main.getByLabel(/^(budget passphrase|hasło budżetu)$/i).fill(passphrase);
    await main.getByRole("button", { name: /^(unlock|odblokuj)$/i }).click();
  }
}
