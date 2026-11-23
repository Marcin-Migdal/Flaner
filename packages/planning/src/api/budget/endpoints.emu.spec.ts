// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import { generateRecoveryKey } from "../../utils/budgetCrypto";
import {
  MAX_MONTH_PAYLOAD_BYTES,
  addBudgetAccount,
  addBudgetTransaction,
  changeBudgetPassphrase,
  countBudgetAccountTransactions,
  createBudget,
  deleteBudgetAccount,
  deleteBudgetTransaction,
  getBudgetAccounts,
  getBudgetAccountsWithTransactions,
  getBudgetCategories,
  getBudgetProfile,
  getBudgetTransactions,
  getLockedBudget,
  replaceRecoveryKey,
  resetBudget,
  setBudgetMainCurrency,
  setMainBudgetAccount,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
  updateBudgetAccount,
} from "./endpoints";
import type { BudgetCategoryTree, BudgetTransactionInput, CreateBudgetInput, UnlockedBudget } from "./types";

const { signInAs, read, list } = setupEmulator();

const ME = "budget-user";
const OTHER = "budget-intruder";
const DENIED = { code: "permission-denied" };

// A transaction in the account's month of `date` (no exchange rate involved)
const monthTransaction = (accountId: string, date = "2026-11-14"): BudgetTransactionInput => ({
  accountId,
  date,
  type: "expense",
  amount: 1000,
  currency: "PLN",
  amountMain: 1000,
  rate: 1,
  rateDate: date,
  rateOverridden: false,
  payee: "Shop",
  description: "",
  categoryId: null,
  confirmed: false,
  excluded: false,
});

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

  it("unlocks with the recovery key in any formatting and rejects another key", async () => {
    await signInAs(ME);
    const recoveryKey = generateRecoveryKey();
    await createBudget(ME, input({ recoveryKey }));
    const locked = await getLockedBudget(ME);
    if (!locked) throw new Error("keys missing");

    const unlocked = await unlockWithRecoveryKey(locked, recoveryKey.replace(/-/g, "").toLowerCase());
    expect(await getBudgetAccounts(unlocked)).toHaveLength(1);

    await expect(unlockWithRecoveryKey(locked, generateRecoveryKey())).rejects.toThrow(
      "planning:errors.budget.wrongRecoveryKey",
    );
    await expect(unlockWithRecoveryKey(locked, "not a key")).rejects.toThrow(
      "planning:errors.budget.invalidRecoveryKey",
    );
  });

  it("changes the passphrase with the old passphrase or the recovery key, without re-encrypting data", async () => {
    await signInAs(ME);
    const recoveryKey = generateRecoveryKey();
    await createBudget(ME, input({ recoveryKey }));
    const before = [await read(`budget_profiles/${ME}`), await read(`budget_categories/${ME}`), await list("budget_accounts")];
    const locked = async () => {
      const keys = await getLockedBudget(ME);
      if (!keys) throw new Error("keys missing");
      return keys;
    };

    await changeBudgetPassphrase(await unlockWithPassphrase(await locked(), "purple tractor sings loudly"), "green kettle hums softly");
    await expect(unlockWithPassphrase(await locked(), "purple tractor sings loudly")).rejects.toThrow(
      "planning:errors.budget.wrongPassphrase",
    );
    const unlocked = await unlockWithPassphrase(await locked(), "green kettle hums softly");
    expect(unlocked.keyId).toBe((await locked()).keyId);

    await changeBudgetPassphrase(await unlockWithRecoveryKey(await locked(), recoveryKey), "blue piano naps daily");
    expect(await getBudgetAccounts(await unlockWithPassphrase(await locked(), "blue piano naps daily"))).toHaveLength(1);
    expect([await read(`budget_profiles/${ME}`), await read(`budget_categories/${ME}`), await list("budget_accounts")]).toEqual(
      before,
    );
  });

  it("a new recovery key unlocks and the old one stops working", async () => {
    await signInAs(ME);
    const oldKey = generateRecoveryKey();
    const budget = await createBudget(ME, input({ recoveryKey: oldKey }));
    const newKey = generateRecoveryKey();

    await replaceRecoveryKey(budget, newKey);

    const locked = await getLockedBudget(ME);
    if (!locked) throw new Error("keys missing");
    await expect(unlockWithRecoveryKey(locked, oldKey)).rejects.toThrow("planning:errors.budget.wrongRecoveryKey");
    expect(await getBudgetAccounts(await unlockWithRecoveryKey(locked, newKey))).toHaveLength(1);
    expect(await getBudgetAccounts(await unlockWithPassphrase(locked, "purple tractor sings loudly"))).toHaveLength(1);
  });

  it("reset deletes every budget document of the user and allows a new onboarding", async () => {
    await signInAs(OTHER);
    const otherBudget = await createBudget(OTHER, input());
    const [otherAccount] = await getBudgetAccounts(otherBudget);
    await addBudgetTransaction(otherBudget, monthTransaction(otherAccount.id));
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [account] = await getBudgetAccounts(budget);
    await addBudgetTransaction(budget, monthTransaction(account.id, "2026-10-02"));
    await addBudgetTransaction(budget, monthTransaction(account.id, "2026-11-02"));

    await resetBudget(ME);

    const months = Object.values(await list("budget_months"));
    expect(months.map((month) => month.memberIds)).toEqual([[OTHER]]);

    expect(await read(`budget_keys/${ME}`)).toBeUndefined();
    expect(await read(`budget_profiles/${ME}`)).toBeUndefined();
    expect(await read(`budget_categories/${ME}`)).toBeUndefined();
    const accounts = Object.values(await list("budget_accounts"));
    expect(accounts.map((account) => account.memberIds)).toEqual([[OTHER]]);
    expect(await read(`budget_keys/${OTHER}`)).toBeDefined();

    await createBudget(ME, input());
    expect(await getLockedBudget(ME)).not.toBeNull();
  });

  it("refuses to re-wrap a budget that was reset in the meantime", async () => {
    await signInAs(ME);
    const stale = await createBudget(ME, input());
    await resetBudget(ME);
    await createBudget(ME, input());

    await expect(changeBudgetPassphrase(stale, "green kettle hums softly")).rejects.toThrow(
      "planning:errors.budget.keyChanged",
    );
    await expect(replaceRecoveryKey(stale, generateRecoveryKey())).rejects.toThrow("planning:errors.budget.keyChanged");
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
    await expect(changeBudgetPassphrase(budget, "green kettle hums softly")).rejects.toMatchObject(DENIED);
    await expect(resetBudget(ME)).rejects.toMatchObject(DENIED);
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

describe("budget accounts", () => {
  const setUp = async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input({ mainAccount: { name: "Main", currency: "PLN" } }));
    const [main] = await getBudgetAccounts(budget);
    return { budget, mainId: main.id };
  };

  it("adds an account with an encrypted name and lists it", async () => {
    const { budget } = await setUp();

    const savings = await addBudgetAccount(budget, { name: "Secret Savings", defaultCurrency: "EUR" });

    expect(await getBudgetAccounts(budget)).toContainEqual(savings);
    expect(JSON.stringify(await read(`budget_accounts/${savings.id}`))).not.toContain("Secret Savings");
  });

  it("renames, hides and shows an account; changes its currency only while it has no transactions", async () => {
    const { budget } = await setUp();
    const { id } = await addBudgetAccount(budget, { name: "Cash", defaultCurrency: "PLN" });

    await updateBudgetAccount(budget, id, { name: "Wallet", defaultCurrency: "EUR", hidden: true });
    expect(await getBudgetAccounts(budget)).toContainEqual(
      expect.objectContaining({ id, name: "Wallet", defaultCurrency: "EUR", hidden: true }),
    );

    await addBudgetTransaction(budget, monthTransaction(id));
    expect(await getBudgetAccountsWithTransactions(budget, [id])).toEqual([id]);
    await expect(updateBudgetAccount(budget, id, { defaultCurrency: "USD" })).rejects.toThrow(
      "planning:errors.budget.accountHasTransactions",
    );
    await updateBudgetAccount(budget, id, { defaultCurrency: "EUR", hidden: false });
    expect(await getBudgetAccounts(budget)).toContainEqual(expect.objectContaining({ id, defaultCurrency: "EUR", hidden: false }));
  });

  it("makes another account main; the main account cannot be hidden or deleted, a hidden one cannot become main", async () => {
    const { budget, mainId } = await setUp();
    const other = await addBudgetAccount(budget, { name: "Other", defaultCurrency: "PLN" });

    await expect(updateBudgetAccount(budget, mainId, { hidden: true })).rejects.toThrow(
      "planning:errors.budget.mainAccountLocked",
    );
    await expect(deleteBudgetAccount(budget, mainId)).rejects.toThrow("planning:errors.budget.mainAccountLocked");

    await setMainBudgetAccount(budget, other.id);
    expect(await getBudgetProfile(budget)).toEqual(expect.objectContaining({ mainAccountId: other.id }));

    await updateBudgetAccount(budget, mainId, { hidden: true });
    await expect(setMainBudgetAccount(budget, mainId)).rejects.toThrow(
      "planning:errors.budget.hiddenAccountCannotBeMain",
    );
  });

  it("locks the main currency once any transaction exists", async () => {
    const { budget, mainId } = await setUp();

    await setBudgetMainCurrency(budget, "EUR");
    expect(await getBudgetProfile(budget)).toEqual(expect.objectContaining({ mainCurrency: "EUR" }));

    await addBudgetTransaction(budget, monthTransaction(mainId));
    await expect(setBudgetMainCurrency(budget, "PLN")).rejects.toThrow("planning:errors.budget.mainCurrencyLocked");
  });

  it("delete cascades to the account's months and keeps other accounts' data", async () => {
    const { budget, mainId } = await setUp();
    const doomed = await addBudgetAccount(budget, { name: "Old", defaultCurrency: "PLN" });
    const kept = await addBudgetTransaction(budget, monthTransaction(mainId));
    for (const date of ["2026-09-01", "2026-10-01", "2026-10-02", "2026-11-14"]) {
      await addBudgetTransaction(budget, monthTransaction(doomed.id, date));
    }
    expect(await countBudgetAccountTransactions(budget, doomed.id)).toBe(4);
    expect(await getBudgetAccountsWithTransactions(budget, [mainId, doomed.id])).toEqual([mainId, doomed.id]);

    await deleteBudgetAccount(budget, doomed.id);

    expect(await read(`budget_accounts/${doomed.id}`)).toBeUndefined();
    expect(Object.keys(await list("budget_months"))).toEqual([`${mainId}_2026-11`]);
    expect(await getBudgetAccounts(budget)).toEqual([expect.objectContaining({ id: mainId })]);
    expect(await getBudgetTransactions(budget, { from: "2026-01", to: "2026-12" })).toEqual([kept]);
  });

  it("denies another user", async () => {
    const { budget } = await setUp();
    const account = await addBudgetAccount(budget, { name: "Mine", defaultCurrency: "PLN" });

    await signInAs(OTHER);
    await expect(updateBudgetAccount({ ...budget, uid: OTHER }, account.id, { hidden: true })).rejects.toMatchObject(
      DENIED,
    );
    await expect(deleteBudgetAccount(budget, account.id)).rejects.toMatchObject(DENIED);
  });
});
