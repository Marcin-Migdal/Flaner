import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedSplitGroup, type E2EUser, type SeedExpense } from "../support/helpers/emulator";
import { SplitGroupPage } from "../support/pages/SplitGroup.page";

// The signed-in user is the creditor (and receiver of every payment); the other participant owes them half of each USD expense
const DATE = "2026-06-01";

test.describe("Split group currency conversion", () => {
  let creditor: E2EUser;
  let debtor: E2EUser;

  const usdExpense = (amount: number): SeedExpense => ({
    amount,
    currency: "USD",
    date: DATE,
    paidBy: creditor.uid,
    splits: [
      { userId: creditor.uid, amount: amount / 2 },
      { userId: debtor.uid, amount: amount / 2 },
    ],
  });

  const usdPayment = (amount: number, status: "pending" | "confirmed") => ({
    payerId: debtor.uid,
    receiverId: creditor.uid,
    amount,
    currency: "USD",
    date: DATE,
    status,
  });

  const openGroup = async (page: SplitGroupPage, groupId: string) => {
    await page.mockExchangeRates({ "USD/EUR": 0.9 });
    await signIn(page.page, creditor);
    await page.goto(groupId);
    await page.openBalances();
  };

  test.beforeEach(async () => {
    [creditor, debtor] = await Promise.all([createUser(), createUser()]);
  });

  test("a pending payment is converted without touching balances and can be confirmed afterwards", async ({ page }) => {
    const group = await seedSplitGroup([creditor, debtor], {
      defaultCurrency: "EUR",
      expenses: [usdExpense(10000)],
      settlements: [usdPayment(5000, "pending")],
    });
    const splitGroup = new SplitGroupPage(page);
    await openGroup(splitGroup, group.id);
    await expect(splitGroup.debtAmount("$50.00")).toBeVisible();

    await splitGroup.convertTo("EUR");

    // Before the fix the pending payment was reverted from USD balances and applied to EUR ones
    await expect(splitGroup.convertButton("EUR")).toHaveCount(0);
    await expect(splitGroup.debtAmount("€45.00")).toBeVisible();
    await expect(splitGroup.debtAmount("$50.00")).toHaveCount(0);

    await splitGroup.confirmPendingPayment();
    await expect(splitGroup.allSettled).toBeVisible();
  });

  test("a pending payment rounded above the converted debt is capped, so it can still be confirmed", async ({ page }) => {
    // 5 × 10.09 USD of debt converts to 5 × 9.08 = 45.40 EUR, while the 50.45 USD payment alone rounds to 45.41 EUR
    const group = await seedSplitGroup([creditor, debtor], {
      defaultCurrency: "EUR",
      expenses: Array.from({ length: 5 }, () => usdExpense(2018)),
      settlements: [usdPayment(5045, "pending")],
    });
    const splitGroup = new SplitGroupPage(page);
    await openGroup(splitGroup, group.id);
    await expect(splitGroup.debtAmount("$50.45")).toBeVisible();

    await splitGroup.convertTo("EUR");
    await expect(splitGroup.debtAmount("€45.40")).toBeVisible();

    await splitGroup.confirmPendingPayment();
    await expect(splitGroup.allSettled).toBeVisible();
    await expect(page.getByText(/settlement amount cannot exceed/i)).toHaveCount(0);
  });

  test("confirmed and pending payments in a foreign currency are converted together", async ({ page }) => {
    // 50 USD owed, 20 USD already paid (confirmed), 30 USD reported (pending)
    const group = await seedSplitGroup([creditor, debtor], {
      defaultCurrency: "EUR",
      expenses: [usdExpense(10000)],
      settlements: [usdPayment(2000, "confirmed"), usdPayment(3000, "pending")],
    });
    const splitGroup = new SplitGroupPage(page);
    await openGroup(splitGroup, group.id);
    await expect(splitGroup.debtAmount("$30.00")).toBeVisible();

    await splitGroup.convertTo("EUR");
    await expect(splitGroup.debtAmount("€27.00")).toBeVisible();

    await splitGroup.confirmPendingPayment();
    await expect(splitGroup.allSettled).toBeVisible();
  });
});
