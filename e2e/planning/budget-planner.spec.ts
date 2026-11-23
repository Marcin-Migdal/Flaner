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
});
