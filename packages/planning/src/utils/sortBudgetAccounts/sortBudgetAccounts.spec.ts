import type { BudgetAccount } from "../../api/budget";
import { sortBudgetAccounts } from "./sortBudgetAccounts";

const account = (id: string, name: string): BudgetAccount => ({
  id,
  name,
  defaultCurrency: "PLN",
  hidden: false,
  createdAt: 0,
});

describe("sortBudgetAccounts", () => {
  it("puts the main account first, then the rest alphabetically in the UI language", () => {
    const accounts = [account("a", "Revolut"), account("b", "ćwiczenia"), account("c", "mBank"), account("d", "Cash")];

    expect(sortBudgetAccounts(accounts, "c", "pl").map(({ name }) => name)).toEqual([
      "mBank",
      "Cash",
      "ćwiczenia",
      "Revolut",
    ]);
  });

  it("sorts alphabetically when the main account is not in the list", () => {
    expect(sortBudgetAccounts([account("a", "b"), account("b", "A")], "x", "en").map(({ id }) => id)).toEqual(["b", "a"]);
  });
});
