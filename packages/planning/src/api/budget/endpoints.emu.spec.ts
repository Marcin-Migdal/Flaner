// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import { generateRecoveryKey } from "../../utils/budgetCrypto";
import {
  MAX_MONTH_PAYLOAD_BYTES,
  addBudgetTransaction,
  createBudget,
  deleteBudgetTransaction,
  getBudgetAccounts,
  getBudgetCategories,
  getBudgetProfile,
  getBudgetTransactions,
  getLockedBudget,
  unlockWithPassphrase,
} from "./endpoints";
import type { BudgetCategoryTree, BudgetTransactionInput, CreateBudgetInput, UnlockedBudget } from "./types";

const { signInAs, read, list } = setupEmulator();

const ME = "budget-user";
const OTHER = "budget-intruder";
const DENIED = { code: "permission-denied" };

const categories: BudgetCategoryTree = {
  expense: [
    {
      id: "cat-food",
      name: "Shopping",
      icon: "shopping-bag",
      color: 8,
      subcategories: [{ id: "sub-groceries", name: "Groceries" }],
    },
  ],
  income: [{ id: "cat-salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const input = (overrides: Partial<CreateBudgetInput> = {}): CreateBudgetInput => ({
  passphrase: "purple tractor sings loudly",
  recoveryKey: generateRecoveryKey(),
  mainCurrency: "PLN",
  mainAccount: { name: "Secret Bank Account", currency: "EUR" },
  categories,
  ...overrides,
});

describe("budget endpoints", () => {
  it("onboarding creates keys, profile, categories and the main account", async () => {
    await signInAs(ME);
    expect(await getLockedBudget(ME)).toBeNull();

    const budget = await createBudget(ME, input());

    const accounts = await getBudgetAccounts(budget);
    expect(accounts).toEqual([
      expect.objectContaining({ name: "Secret Bank Account", defaultCurrency: "EUR", hidden: false }),
    ]);
    expect(await getBudgetProfile(budget)).toEqual({
      mainCurrency: "PLN",
      mainAccountId: accounts[0].id,
      fileAccountMappings: {},
    });
    expect(await getBudgetCategories(budget)).toEqual(categories);
    expect(await getLockedBudget(ME)).toEqual(expect.objectContaining({ uid: ME, keyId: budget.keyId }));
  });

  it("stores no readable account name, category name or passphrase", async () => {
    await signInAs(ME);
    const passphrase = "purple tractor sings loudly";
    await createBudget(ME, input({ passphrase }));

    const stored = JSON.stringify([
      await read(`budget_keys/${ME}`),
      await read(`budget_profiles/${ME}`),
      await read(`budget_categories/${ME}`),
      await list("budget_accounts"),
    ]);
    expect(stored).not.toContain("Secret Bank Account");
    expect(stored).not.toContain("Groceries");
    expect(stored).not.toContain(passphrase);
  });

  it("unlocks with the passphrase and rejects a wrong one", async () => {
    await signInAs(ME);
    await createBudget(ME, input());
    const locked = await getLockedBudget(ME);
    if (!locked) throw new Error("keys missing");

    const unlocked = await unlockWithPassphrase(locked, "purple tractor sings loudly");
    expect(await getBudgetAccounts(unlocked)).toHaveLength(1);

    await expect(unlockWithPassphrase(locked, "orange tractor sings loudly")).rejects.toThrow(
      "planning:errors.budget.wrongPassphrase",
    );
  });

  it("never runs onboarding twice", async () => {
    await signInAs(ME);
    await createBudget(ME, input());

    await expect(createBudget(ME, input())).rejects.toThrow("planning:errors.budget.alreadySetUp");
    expect(Object.keys(await list("budget_accounts"))).toHaveLength(1);
  });

  it("denies another user", async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());

    await signInAs(OTHER);
    await expect(getLockedBudget(ME)).rejects.toMatchObject(DENIED);
    await expect(getBudgetProfile(budget)).rejects.toMatchObject(DENIED);
    await expect(getBudgetCategories(budget)).rejects.toMatchObject(DENIED);
    await expect(getBudgetAccounts(budget)).rejects.toMatchObject(DENIED);
    await expect(createBudget(ME, input())).rejects.toMatchObject(DENIED);
    expect(await getBudgetAccounts({ ...budget, uid: OTHER })).toEqual([]);
  });
});

describe("budget transactions", () => {
  const transaction = (accountId: string, overrides: Partial<BudgetTransactionInput> = {}): BudgetTransactionInput => ({
    accountId,
    date: "2026-11-14",
    type: "expense",
    amount: 2550,
    currency: "EUR",
    // The exchange rate is looked up by the form, so no external call happens here
    amountMain: 10965,
    rate: 4.3,
    rateDate: "2026-11-13",
    rateOverridden: false,
    payee: "Secret Payee",
    description: "Secret note",
    categoryId: "sub-groceries",
    confirmed: true,
    excluded: false,
    ...overrides,
  });

  const setUp = async (): Promise<{ budget: UnlockedBudget; accountId: string }> => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [account] = await getBudgetAccounts(budget);
    return { budget, accountId: account.id };
  };

  it("round-trips transactions encrypted: nothing readable about payee, note or amount is stored", async () => {
    const { budget, accountId } = await setUp();

    const added = await addBudgetTransaction(budget, transaction(accountId));

    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([added]);
    const stored = await read(`budget_months/${accountId}_2026-11`);
    expect(stored).toEqual({ accountId, memberIds: [ME], month: "2026-11", payload: expect.anything() });
    const raw = JSON.stringify(stored);
    for (const secret of ["Secret Payee", "Secret note", "2550", "10965", "sub-groceries"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("packs transactions into one document per account and month, and queries a month range", async () => {
    const { budget, accountId } = await setUp();

    const october = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-10-31" }));
    const first = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-11-01" }));
    const second = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-11-30", type: "income" }));
    const december = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-12-01" }));

    expect(Object.keys(await list("budget_months")).sort()).toEqual([
      `${accountId}_2026-10`,
      `${accountId}_2026-11`,
      `${accountId}_2026-12`,
    ]);
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([first, second]);
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-12" })).toEqual(
      expect.arrayContaining([october, first, second, december]),
    );
  });

  it("deletes a transaction and the month document with its last one", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, transaction(accountId));
    const second = await addBudgetTransaction(budget, transaction(accountId, { payee: "Other" }));

    await deleteBudgetTransaction(budget, first);
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([second]);

    await deleteBudgetTransaction(budget, second);
    expect(await read(`budget_months/${accountId}_2026-11`)).toBeUndefined();
  });

  it("rejects a write that would push the month over the size guard, keeping the month as it was", async () => {
    const { budget, accountId } = await setUp();
    const kept = await addBudgetTransaction(budget, transaction(accountId));

    await expect(
      addBudgetTransaction(budget, transaction(accountId, { description: "x".repeat(MAX_MONTH_PAYLOAD_BYTES) })),
    ).rejects.toThrow("planning:errors.budget.monthTooLarge");
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([kept]);
  });

  it("denies another user", async () => {
    const { budget, accountId } = await setUp();
    const added = await addBudgetTransaction(budget, transaction(accountId));

    await signInAs(OTHER);
    await expect(getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).rejects.toMatchObject(DENIED);
    await expect(addBudgetTransaction(budget, transaction(accountId))).rejects.toMatchObject(DENIED);
    await expect(deleteBudgetTransaction(budget, added)).rejects.toMatchObject(DENIED);
    expect(await getBudgetTransactions({ ...budget, uid: OTHER }, { from: "2026-11", to: "2026-11" })).toEqual([]);
  });
});
