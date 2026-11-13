import { expect, test } from "@playwright/test";
import { signIn } from "../support/helpers/auth";
import { createUser, seedSplitGroup, type E2EUser } from "../support/helpers/emulator";
import { SplitGroupPage } from "../support/pages/SplitGroup.page";

// `debtor` owes `creditor` 50 EUR; `third` is another participant
const DATE = "2026-06-01";

test.describe("Split group settlements", () => {
  let creditor: E2EUser;
  let debtor: E2EUser;
  let third: E2EUser;

  const halfOf = (amount: number) => ({
    amount,
    currency: "EUR",
    date: DATE,
    paidBy: creditor.uid,
    splits: [
      { userId: creditor.uid, amount: amount / 2 },
      { userId: debtor.uid, amount: amount / 2 },
    ],
  });

  const openGroupAs = async (page: SplitGroupPage, user: E2EUser, groupId: string) => {
    await signIn(page.page, user);
    await page.goto(groupId);
  };

  test.beforeEach(async () => {
    [creditor, debtor, third] = await Promise.all([createUser(), createUser(), createUser()]);
  });

  test("a payment recorded by a third participant waits for the receiver's confirmation", async ({ browser }) => {
    test.slow(); // two users sign in
    const group = await seedSplitGroup([creditor, debtor, third], {
      defaultCurrency: "EUR",
      expenses: [halfOf(10000)],
      settlements: [],
    });

    const thirdContext = await browser.newContext();
    const thirdView = new SplitGroupPage(await thirdContext.newPage());
    await openGroupAs(thirdView, third, group.id);
    await thirdView.recordPayment({ payer: debtor.username, receiver: creditor.username, amount: "50" });
    await expect(thirdView.dialog).toHaveCount(0);
    await thirdView.openBalances();
    // Still owed: the payment is pending until the receiver confirms it
    await expect(thirdView.debtAmount("€50.00")).toBeVisible();
    await thirdContext.close();

    const creditorContext = await browser.newContext();
    const creditorView = new SplitGroupPage(await creditorContext.newPage());
    await openGroupAs(creditorView, creditor, group.id);
    await creditorView.openBalances();
    await creditorView.confirmPendingPayment();
    await expect(creditorView.allSettled).toBeVisible();
    await creditorContext.close();
  });

  test("a debt that is already waiting for confirmation cannot be paid again", async ({ page }) => {
    const group = await seedSplitGroup([creditor, debtor], {
      defaultCurrency: "EUR",
      expenses: [halfOf(10000)],
      settlements: [{ payerId: debtor.uid, receiverId: creditor.uid, amount: 5000, currency: "EUR", date: DATE, status: "pending" }],
    });
    const debtorView = new SplitGroupPage(page);
    await openGroupAs(debtorView, debtor, group.id);

    await debtorView.recordPayment({ receiver: creditor.username, amount: "50" });

    await expect(page.getByText(/already waiting for confirmation/i)).toBeVisible();
    await expect(debtorView.dialog).toBeVisible();
  });
});
