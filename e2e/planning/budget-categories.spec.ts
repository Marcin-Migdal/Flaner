import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "../support/helpers/auth";
import { BudgetGatePage } from "../support/pages/BudgetGate.page";
import { BudgetTransactionsPage } from "../support/pages/BudgetTransactions.page";

const PASSPHRASE = "purple tractor sings loudly";

test.describe("Budget categories", () => {
  test("a category is added, reordered by keyboard, and a deleted subcategory moves its transactions and rules to the replacement", async ({
    page,
  }) => {
    // Onboarding runs 600,000 PBKDF2 rounds in the browser
    test.slow();
    await signInAsNewUser(page);
    const gate = new BudgetGatePage(page);
    const transactions = new BudgetTransactionsPage(page);

    await page.goto("/planning/budget/transactions");
    await gate.completeOnboarding({ passphrase: PASSPHRASE, accountName: "Cash" });
    await transactions.addExpense({ amount: "20", payee: "Bakery Central" });
    await expect(transactions.addDialog).toBeHidden();
    // Groceries on the list: also teaches a rule for the payee
    await transactions.row("Bakery Central").getByRole("combobox", { name: /^(category of|kategoria:)/i }).fill("Groceries");
    await page.keyboard.press("Enter");
    await expect(transactions.row("Bakery Central").getByText(/groceries|spożywcze/i)).toBeVisible();

    // Settings → Categories (in-app navigation: no second unlock)
    await page.getByRole("link", { name: /^(settings|ustawienia)$/i }).click();
    await page.getByRole("tab", { name: /^(categories|kategorie)$/i }).click();
    await expect(page).toHaveURL(/#categories$/);
    const expense = page.getByRole("region", { name: /^(expense categories|kategorie wydatków)$/i });
    const order = () =>
      expense
        .getByRole("button", { name: /^(move|przenieś) /i })
        .evaluateAll((handles) => handles.map((handle) => handle.getAttribute("aria-label")?.replace(/^\S+ /, "")));

    // Add Aquarium with an icon and a colour: it lands last
    await expense.getByRole("button", { name: /^(add category|dodaj kategorię)$/i }).click();
    const addDialog = page.getByRole("dialog", { name: /^(add category|dodaj kategorię)$/i });
    await addDialog.getByLabel(/^(name|nazwa)$/i).fill("Aquarium");
    // The radios are drawn by their tiles: pick by clicking the tile
    await addDialog.getByTitle(/^(paw print|łapa)$/i).click();
    await addDialog.getByTitle(/^(colour|kolor) 4$/i).click();
    await expect(addDialog.getByRole("radio", { name: /^(paw print|łapa)$/i })).toBeChecked();
    await addDialog.getByRole("button", { name: /^(add|dodaj)$/i }).click();
    await expect(addDialog).toBeHidden();
    await expect.poll(async () => (await order()).at(-1)).toBe("Aquarium");

    // Keyboard reorder: Space picks up, an arrow moves, Space drops
    const before = await order();
    await expense.getByRole("button", { name: /^(move|przenieś) aquarium$/i }).focus();
    // Each step waits for its screen-reader announcement (the next key needs the measured positions)
    const at = (position: number) =>
      expect(
        page.getByText(new RegExp(`^aquarium (is at position|jest na pozycji) ${position} (of|z) ${before.length}\\.$`, "i")),
      ).toBeAttached();
    await page.keyboard.press("Space");
    await at(before.length);
    await page.keyboard.press("ArrowUp");
    await at(before.length - 1);
    await page.keyboard.press("Space");
    await expect.poll(order).toEqual([...before.slice(0, -2), "Aquarium", before.at(-2)]);

    // Delete Groceries: the dialog counts its transaction; its replacement is Aquarium
    await expense.getByRole("button", { name: /^(show subcategories of|pokaż podkategorie) (shopping|zakupy)$/i }).click();
    await expense.getByRole("button", { name: /^(actions for|akcje dla) (groceries|spożywcze)$/i }).click();
    await page.getByRole("menuitem", { name: /^(delete|usuń)$/i }).click();
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toContainText(/1 transaction uses it|używa jej 1 transakcja/i);
    await deleteDialog.getByLabel(/^(move their transactions to|przenieś ich transakcje do)$/i).fill("Aquarium");
    await page.keyboard.press("Enter");
    await expect(deleteDialog.getByText("Aquarium", { exact: true }).last()).toBeVisible();
    await deleteDialog.getByRole("button", { name: /^(yes, delete|tak, usuń)$/i }).click();
    await expect(deleteDialog).toBeHidden();
    await expect(expense.getByText(/^(groceries|spożywcze)$/i)).toHaveCount(0);

    // Its rule now points at Aquarium
    await page.getByRole("tab", { name: /^(rules|reguły)$/i }).click();
    await expect(page.getByRole("tabpanel").getByText("Aquarium", { exact: true })).toBeVisible();

    // And so does its transaction, still confirmed
    await page.locator('a[href="/planning/budget/transactions"]').first().click();
    await expect(transactions.row("Bakery Central").getByText("Aquarium")).toBeVisible();
    await expect(
      transactions.row("Bakery Central").getByRole("button", { name: /^(confirm category|potwierdź kategorię)/i }),
    ).toHaveCount(0);
  });
});
