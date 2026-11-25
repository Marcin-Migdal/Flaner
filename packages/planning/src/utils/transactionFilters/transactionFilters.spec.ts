import { describe, expect, it } from "vitest";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import {
  DEFAULT_TRANSACTION_FILTERS,
  UNCATEGORIZED_FILTER,
  hasActiveTransactionFilters,
  filterTransactions,
  readTransactionFilters,
  writeTransactionFilters,
  type TransactionFilters,
} from "./transactionFilters";

const accounts: BudgetAccount[] = [
  { id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 },
  { id: "cash", name: "Cash", defaultCurrency: "PLN", hidden: false, createdAt: 2 },
  { id: "savings", name: "Savings", defaultCurrency: "PLN", hidden: true, createdAt: 3 },
];

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "shopping",
      name: "Shopping",
      icon: "shopping-bag",
      color: 1,
      subcategories: [{ id: "groceries", name: "Groceries" }],
    },
    { id: "car", name: "Car", icon: "car", color: 2, subcategories: [] },
  ],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const tx = (id: string, overrides: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
  id,
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: 1000,
  currency: "PLN",
  amountMain: 1000,
  rate: 1,
  rateDate: "2026-11-10",
  rateOverridden: false,
  payee: "Shop",
  description: "",
  categoryId: "groceries",
  confirmed: true,
  excluded: false,
  ...overrides,
});

const filter = (transactions: BudgetTransaction[], overrides: Partial<TransactionFilters>) =>
  filterTransactions(transactions, { ...DEFAULT_TRANSACTION_FILTERS, ...overrides }, { accounts, categories }).map(
    (transaction) => transaction.id,
  );

describe("filterTransactions", () => {
  it("by default hides excluded transactions and hidden accounts", () => {
    const rows = [tx("shown"), tx("excluded", { excluded: true }), tx("hidden", { accountId: "savings" })];

    expect(filter(rows, {})).toEqual(["shown"]);
  });

  it("searches payee and description, ignoring case and surrounding spaces", () => {
    const rows = [tx("payee", { payee: "BIEDRONKA 1234" }), tx("note", { description: "biedronka run" }), tx("other")];

    expect(filter(rows, { search: "  Biedronka " })).toEqual(["payee", "note"]);
  });

  it("shows only the picked accounts, never a hidden one", () => {
    const rows = [tx("main"), tx("cash", { accountId: "cash" }), tx("savings", { accountId: "savings" })];

    expect(filter(rows, { accountIds: ["cash", "savings"] })).toEqual(["cash"]);
  });

  it("matches a picked category with its subcategories, and Uncategorized for no or a deleted category", () => {
    const rows = [
      tx("sub"),
      tx("main", { categoryId: "shopping" }),
      tx("car", { categoryId: "car" }),
      tx("none", { categoryId: null }),
      tx("deleted", { categoryId: "gone" }),
    ];

    expect(filter(rows, { categoryIds: ["shopping"] })).toEqual(["sub", "main"]);
    expect(filter(rows, { categoryIds: ["groceries", UNCATEGORIZED_FILTER] })).toEqual(["sub", "none", "deleted"]);
  });

  it("matches a transaction through one of its split-offs", () => {
    const rows = [
      tx("split", { categoryId: "groceries", splitOffs: [{ id: "s", amount: 1, categoryId: "car", note: "", excluded: false }] }),
      tx("plain", { categoryId: "groceries" }),
    ];
    expect(filter(rows, { categoryIds: ["car"] })).toEqual(["split"]);
  });

  it("combines direction, status and relevance", () => {
    const rows = [
      tx("expense"),
      tx("income", { type: "income", categoryId: "salary" }),
      tx("unconfirmed", { confirmed: false }),
      tx("excludedIncome", { type: "income", excluded: true }),
    ];

    expect(filter(rows, { direction: "income" })).toEqual(["income"]);
    expect(filter(rows, { status: "unconfirmed" })).toEqual(["unconfirmed"]);
    expect(filter(rows, { status: "confirmed", direction: "expense" })).toEqual(["expense"]);
    expect(filter(rows, { relevance: "excluded" })).toEqual(["excludedIncome"]);
    expect(filter(rows, { relevance: "all", direction: "income" })).toEqual(["income", "excludedIncome"]);
  });
});

describe("transaction filters in the URL", () => {
  it("round-trips every filter and leaves the defaults and other params alone", () => {
    const filters: TransactionFilters = {
      search: "rent",
      accountIds: ["main", "cash"],
      categoryIds: ["shopping", UNCATEGORIZED_FILTER],
      direction: "expense",
      status: "unconfirmed",
      relevance: "all",
    };
    const params = writeTransactionFilters(new URLSearchParams("month=2026-11"), filters);

    expect(params.get("month")).toBe("2026-11");
    expect(readTransactionFilters(params)).toEqual(filters);
    expect(writeTransactionFilters(params, DEFAULT_TRANSACTION_FILTERS).toString()).toBe("month=2026-11");
  });

  it("falls back to the defaults for unknown values", () => {
    expect(readTransactionFilters(new URLSearchParams("direction=sideways&status=&relevance=x"))).toEqual(
      DEFAULT_TRANSACTION_FILTERS,
    );
  });
});

describe("hasActiveTransactionFilters", () => {
  it("is true once any filter differs from the defaults", () => {
    expect(hasActiveTransactionFilters(DEFAULT_TRANSACTION_FILTERS)).toBe(false);
    expect(hasActiveTransactionFilters({ ...DEFAULT_TRANSACTION_FILTERS, search: "x" })).toBe(true);
    expect(hasActiveTransactionFilters({ ...DEFAULT_TRANSACTION_FILTERS, relevance: "all" })).toBe(true);
  });
});
