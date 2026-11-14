import { type Locator, type Page } from "@playwright/test";

export class SplitGroupPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly balancesTab: Locator;
  readonly balancesPanel: Locator;
  readonly markAsPaidButton: Locator;
  readonly allSettled: Locator;
  readonly settlementTooLargeError: Locator;
  readonly paymentAlreadyPendingError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog");
    this.balancesTab = page.getByRole("tab", { name: /^balances$/i });
    this.balancesPanel = page.getByRole("tabpanel");
    this.markAsPaidButton = this.balancesPanel.getByRole("button", { name: /^mark as paid$/i });
    this.allSettled = this.balancesPanel.getByText(/everyone is settled up/i);
    this.settlementTooLargeError = page.getByText(/settlement amount cannot exceed/i);
    this.paymentAlreadyPendingError = page.getByText(/already waiting for confirmation/i);
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

  /** Records a payment through the header "Settle up" dialog; `payer` / `receiver` are member names ("You" for oneself). */
  async recordPayment({ payer, receiver, amount }: { payer?: string; receiver: string; amount: string }) {
    await this.page.getByRole("button", { name: /^settle up$/i }).click();
    if (payer) await this.chooseMember(/^who pays$/i, payer);
    await this.chooseMember(/^to whom$/i, receiver);
    await this.dialog.getByRole("spinbutton", { name: /^amount$/i }).fill(amount);
    await this.dialog.getByRole("button", { name: /^save$/i }).click();
  }

  private async chooseMember(label: RegExp, name: string) {
    // react-select's input is not clickable; focus it and open the menu with the keyboard
    await this.dialog.getByLabel(label).focus();
    await this.page.keyboard.press("ArrowDown");
    await this.page.getByRole("option", { name, exact: true }).click();
  }

  async confirmPendingPayment() {
    // Until the pending payment has loaded, "Mark as paid" opens "Record a payment" instead (#106)
    await this.balancesPanel.getByRole("img", { name: /^pending confirmation$/i }).waitFor();
    await this.markAsPaidButton.click();
    await this.dialog.getByRole("button", { name: /^confirm receipt$/i }).click();
  }
}
