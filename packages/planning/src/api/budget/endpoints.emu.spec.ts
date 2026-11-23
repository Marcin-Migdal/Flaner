// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { fb } from "@flaner/shared/firebase";
import { setupEmulator } from "@flaner/test-utils/emulator";
import { Bytes, collection, doc, setDoc } from "firebase/firestore";
import { encryptJson, generateDataKey, generateRecoveryKey, wrapDataKey } from "../../utils/budgetCrypto";
import {
  MAX_MONTH_PAYLOAD_BYTES,
  addBudgetTransaction,
  changeBudgetPassphrase,
  createBudget,
  deleteBudgetTransaction,
  deleteBudgetTransactions,
  getBudgetAccounts,
  getBudgetCategories,
  getBudgetProfile,
  getBudgetTransactions,
  getLockedBudget,
  replaceRecoveryKey,
  resetBudget,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
  updateBudgetTransaction,
  updateBudgetTransactions,
} from "./endpoints";
import type {
  BudgetAccountDoc,
  BudgetCategoryTree,
  BudgetTransactionInput,
  BudgetTransactionPatch,
  CreateBudgetInput,
  UnlockedBudget,
} from "./types";

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

  // Accounts beyond the main one are created in Settings (#177); written here directly, as that flow would
  const addAccount = async (budget: UnlockedBudget, name: string): Promise<string> => {
    const ref = doc(collection(fb.firestore, "budget_accounts"));
    const accountKey = await generateDataKey();
    const path = `budget_accounts/${ref.id}`;
    const accountDoc: BudgetAccountDoc = {
      memberIds: [budget.uid],
      defaultCurrency: "PLN",
      hidden: false,
      wrappedKeys: { [budget.uid]: Bytes.fromUint8Array(await wrapDataKey(accountKey, budget.userKey, path)) },
      payload: Bytes.fromUint8Array(await encryptJson({ name }, accountKey, path)),
      createdAt: Date.now(),
    };
    await setDoc(ref, accountDoc);
    return ref.id;
  };

  it("edits a transaction in place, keeping its position in the month", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, transaction(accountId));
    const second = await addBudgetTransaction(budget, transaction(accountId, { payee: "Second" }));

    const edited = await updateBudgetTransaction(budget, first, { payee: "Renamed", amount: 3000, confirmed: false });

    expect(edited).toEqual({ ...first, payee: "Renamed", amount: 3000, confirmed: false });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([edited, second]);
  });

  it("moves a transaction to another month atomically, deleting the month it leaves empty", async () => {
    const { budget, accountId } = await setUp();
    const moved = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-11-14" }));

    const edited = await updateBudgetTransaction(budget, moved, { date: "2026-12-02" });

    expect(edited).toEqual({ ...moved, date: "2026-12-02" });
    expect(Object.keys(await list("budget_months"))).toEqual([`${accountId}_2026-12`]);
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-12" })).toEqual([edited]);
  });

  it("moves a transaction to another account and month in one write, leaving the other rows where they were", async () => {
    const { budget, accountId } = await setUp();
    const savingsId = await addAccount(budget, "Savings");
    const moved = await addBudgetTransaction(budget, transaction(accountId));
    const stays = await addBudgetTransaction(budget, transaction(accountId, { payee: "Stays" }));
    const there = await addBudgetTransaction(budget, transaction(savingsId, { date: "2026-10-03", payee: "There" }));

    const edited = await updateBudgetTransaction(budget, moved, { accountId: savingsId, date: "2026-10-20" });

    expect(edited).toEqual({ ...moved, accountId: savingsId, date: "2026-10-20" });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([stays]);
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-10" })).toEqual([there, edited]);
  });

  it("never changes the frozen import fields of an imported transaction", async () => {
    const { budget, accountId } = await setUp();
    const imported = await addBudgetTransaction(
      budget,
      transaction(accountId, { sourceFile: "statement.csv", importHash: "frozen-hash" }),
    );
    // Not a fresh literal, so the extra fields get past the type, as a careless caller's object would
    const patch: BudgetTransactionPatch = Object.assign({ payee: "Fixed" }, { importHash: "x", sourceFile: "y" });

    const edited = await updateBudgetTransaction(budget, imported, patch);

    expect(edited).toMatchObject({ payee: "Fixed", sourceFile: "statement.csv", importHash: "frozen-hash" });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([edited]);
  });

  it("applies bulk edits and bulk deletes across months and accounts in one transaction", async () => {
    const { budget, accountId } = await setUp();
    const savingsId = await addAccount(budget, "Savings");
    const a = await addBudgetTransaction(budget, transaction(accountId, { categoryId: null, confirmed: false }));
    const b = await addBudgetTransaction(budget, transaction(savingsId, { date: "2026-10-01", confirmed: false }));
    const c = await addBudgetTransaction(budget, transaction(savingsId, { date: "2026-10-02" }));

    const edited = await updateBudgetTransactions(budget, [
      { ref: a, patch: { categoryId: "cat-food", confirmed: true } },
      { ref: b, patch: { categoryId: "cat-food", confirmed: true } },
    ]);
    expect(edited).toEqual([
      { ...a, categoryId: "cat-food", confirmed: true },
      { ...b, categoryId: "cat-food", confirmed: true },
    ]);

    await deleteBudgetTransactions(budget, [edited[0], edited[1]]);
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-11" })).toEqual([c]);
    expect(Object.keys(await list("budget_months"))).toEqual([`${savingsId}_2026-10`]);
  });

  it("fails as a whole when one edited transaction no longer exists", async () => {
    const { budget, accountId } = await setUp();
    const kept = await addBudgetTransaction(budget, transaction(accountId));

    await expect(
      updateBudgetTransactions(budget, [
        { ref: kept, patch: { payee: "Changed" } },
        { ref: { ...kept, id: "gone" }, patch: { payee: "Changed" } },
      ]),
    ).rejects.toThrow("planning:errors.budget.transactionMissing");
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([kept]);
  });

  it("denies another user", async () => {
    const { budget, accountId } = await setUp();
    const added = await addBudgetTransaction(budget, transaction(accountId));

    await signInAs(OTHER);
    await expect(getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).rejects.toMatchObject(DENIED);
    await expect(addBudgetTransaction(budget, transaction(accountId))).rejects.toMatchObject(DENIED);
    await expect(deleteBudgetTransaction(budget, added)).rejects.toMatchObject(DENIED);
    await expect(updateBudgetTransaction(budget, added, { date: "2026-12-01" })).rejects.toMatchObject(DENIED);
    expect(await getBudgetTransactions({ ...budget, uid: OTHER }, { from: "2026-11", to: "2026-11" })).toEqual([]);
  });
});
