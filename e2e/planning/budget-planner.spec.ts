import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { readDocument } from "../support/helpers/emulator";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetPlannerPage } from "../support/pages/BudgetPlanner.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";
const SHOPPING = /^(Shopping|Zakupy)$/;
const GROCERIES = /(Groceries|Spożywcze)/;

test.describe("Budget Planner", () => {
  test("a limit set in the Add limit dialog shows on its category card, is edited in place and stored encrypted", async ({
    page,
  }) => {
    // Onboarding and unlock each run 600,000 PBKDF2 rounds in the browser
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const planner = new BudgetPlannerPage(page);

    await page.goto("/planning/budget/planner");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Wallet" });
    // Onboarding lands in Transactions; the sidebar link keeps the unlocked budget in memory
    await expect(new BudgetTransactionsPage(page).heading).toBeVisible();
    await page.getByRole("link", { name: /^(planner|planer)$/i }).click();
    await expect(planner.heading).toBeVisible();

    await planner.addLimit({ category: GROCERIES, amount: "500" });
    await expect(planner.addLimitDialog).toBeHidden();
    await expect(planner.card(SHOPPING)).toBeVisible();
    await expect(planner.limitField(GROCERIES)).toHaveValue("500");
    // The Planner opens on the current month
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const planPath = `budget_plans/${user.uid}_${month}`;
    const created = await readDocument(planPath);
    expect(created?.ownerId).toBe(user.uid);

    await planner.limitField(GROCERIES).fill("650.5");
    await planner.limitField(GROCERIES).press("Enter");

    // Saved once the stored plan changes; it holds no readable amount
    await expect.poll(async () => (await readDocument(planPath))?.updatedAt).not.toBe(created?.updatedAt);
    const stored = JSON.stringify(await readDocument(planPath));
    expect(stored).toContain(month);
    expect(stored).not.toContain("65050");

    await page.reload();
    await gate.unlock(PASSPHRASE);
    await expect(planner.limitField(GROCERIES)).toHaveValue("650.5");
  });

  test("an empty month starts with a limit prefilled from a recurring transaction, then the limit is changed", async ({
    page,
  }) => {
    test.slow();
    const user = await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);
    const planner = new BudgetPlannerPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Wallet" });
    await expect(transactions.heading).toBeVisible();
    await transactions.addExpense({ amount: "43", payee: "Streamly", category: GROCERIES });
    await expect(transactions.row("Streamly")).toBeVisible();
    await transactions.makeRecurring("Streamly");
    await expect(page.getByRole("dialog", { name: /^(make recurring|ustaw jako cykliczną)$/i })).toBeHidden();

    // Next month: no plan yet, one unpaid occurrence of 43.00 expected
    await page.getByRole("link", { name: /^(planner|planer)$/i }).click();
    await expect(planner.heading).toBeVisible();
    await planner.nextMonth();
    await expect(planner.startCard).toBeVisible();
    await expect(planner.startCard.getByText(GROCERIES)).toBeVisible();
    await planner.startCard.getByRole("button", { name: /^(start empty|zacznij od zera)$/i }).click();

    await expect(planner.startCard).toBeHidden();
    await expect(planner.card(SHOPPING)).toBeVisible();
    await expect(planner.limitField(GROCERIES)).toHaveValue("43");
    const next = new Date();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    const planPath = `budget_plans/${user.uid}_${month}`;
    const created = await readDocument(planPath);
    expect(created?.ownerId).toBe(user.uid);
    expect(JSON.stringify(created)).not.toContain("4300");

    // A limit set by hand replaces the prefilled one
    await planner.limitField(GROCERIES).fill("60");
    await planner.limitField(GROCERIES).press("Enter");
    await expect.poll(async () => (await readDocument(planPath))?.updatedAt).not.toBe(created?.updatedAt);
    await expect(planner.limitField(GROCERIES)).toHaveValue("60");
  });
});

