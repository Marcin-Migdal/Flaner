import { type Locator, type Page } from "@playwright/test";

export class SplitGroupPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly balancesTab: Locator;
  readonly balancesPanel: Locator;
  readonly markAsPaidButton: Locator;
  readonly allSettled: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog");
    this.balancesTab = page.getByRole("tab", { name: /^balances$/i });
    this.balancesPanel = page.getByRole("tabpanel");
    this.markAsPaidButton = this.balancesPanel.getByRole("button", { name: /^mark as paid$/i });
    this.allSettled = this.balancesPanel.getByText(/everyone is settled up/i);
  }

  async goto(groupId: string) {
    await this.page.goto(`/planning/splits#${groupId}`);
  }

  /** Serves fixed historical rates instead of the Frankfurter API, so conversions are deterministic. */
  async mockExchangeRates(rates: Record<string, number>) {
    await this.page.route("https://api.frankfurter.dev/**", async (route) => {
      const params = new URL(route.request().url()).searchParams;
      const base = params.get("base") ?? "";
      const quote = params.get("quotes") ?? "";
      const date = params.get("date") ?? "";
      await route.fulfill({ json: [{ date, base, quote, rate: rates[`${base}/${quote}`] }] });
    });
  }

  convertButton(currency: string): Locator {
    return this.page.getByRole("button", { name: `Convert to ${currency}` });
  }

  async convertTo(currency: string) {
    await this.convertButton(currency).click();
    await this.dialog.getByRole("button", { name: /^convert$/i }).click();
  }

  async openBalances() {
    await this.balancesTab.click();
  }

  /** A visible amount in the "Who pays whom" list (debt cards render it twice for different breakpoints). */
  debtAmount(formattedAmount: string): Locator {
    return this.balancesPanel.getByText(formattedAmount, { exact: true }).filter({ visible: true });
  }

  async confirmPendingPayment() {
    await this.markAsPaidButton.click();
    await this.dialog.getByRole("button", { name: /^confirm receipt$/i }).click();
  }
}
