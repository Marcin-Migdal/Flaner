import { type Locator, type Page } from "@playwright/test";

export type BudgetOnboardingInput = { passphrase: string; accountName: string };

/** What a Budget page shows while locked: the onboarding wizard (first visit) or the unlock screen. */
export class BudgetGatePage {
  readonly page: Page;
  readonly onboardingHeading: Locator;
  readonly unlockHeading: Locator;
  readonly recoveryKey: Locator;
  readonly continueButton: Locator;
  readonly wrongPassphraseError: Locator;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.onboardingHeading = main.getByRole("heading", { name: /^(set up your budget|skonfiguruj budżet)$/i });
    this.unlockHeading = main.getByRole("heading", { name: /^(unlock your budget|odblokuj budżet)$/i });
    // The key has no text role: its groups are hidden, the full key is the element's label
    this.recoveryKey = page.getByTestId("budget-recovery-key");
    this.continueButton = main.getByRole("button", { name: /^(continue|dalej)$/i });
    this.wrongPassphraseError = main.getByText(/wrong passphrase|nieprawidłowe hasło/i);
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

  /** Comes back to this tab from another window (fires the focus refetch). */
  async returnToTab() {
    await this.page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  }

  /** Unlocks with the passphrase; "Remember this device" is on by default. */
  async unlock(passphrase: string, { remember = true }: { remember?: boolean } = {}) {
    const main = this.page.getByRole("main");
    await main.getByLabel(/^(budget passphrase|hasło budżetu)$/i).fill(passphrase);
    await main.getByRole("checkbox", { name: /remember this device|zapamiętaj to urządzenie/i }).setChecked(remember);
    await main.getByRole("button", { name: /^(unlock|odblokuj)$/i }).click();
  }

  /** Unlocks with the recovery key, then sets the new passphrase the unlock asks for. */
  async unlockWithRecoveryKey(recoveryKey: string, newPassphrase: string) {
    const main = this.page.getByRole("main");
    await main.getByRole("button", { name: /use your recovery key|użyj klucza odzyskiwania/i }).click();
    await main.getByLabel(/^(recovery key|klucz odzyskiwania)$/i).fill(recoveryKey);
    await main.getByRole("button", { name: /^(unlock|odblokuj)$/i }).click();

    await main.getByLabel(/^(new passphrase|nowe hasło)$/i).fill(newPassphrase);
    await main.getByLabel(/^(repeat the new passphrase|powtórz nowe hasło)$/i).fill(newPassphrase);
    await main.getByRole("button", { name: /^(save and open the budget|zapisz i otwórz budżet)$/i }).click();
  }
}
