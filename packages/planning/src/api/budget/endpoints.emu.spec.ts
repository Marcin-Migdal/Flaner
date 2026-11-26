// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fb } from "@flaner/shared/firebase";
import { setupEmulator } from "@flaner/test-utils/emulator";
import { addMonths, format, setDate } from "date-fns";
import { Bytes, collection, doc, setDoc } from "firebase/firestore";
import { encryptJson, generateDataKey, generateRecoveryKey, wrapDataKey } from "../../utils/budgetCrypto";
import { addCategory, addSubcategory, reorderCategories } from "../../utils/categoryTree";
import {
  buildImportPreview,
  decodeStatementFile,
  findImportTemplate,
  parseStatementRows,
  parseTemplateRows,
  readStatement,
  splitRowsByFileAccount,
  importTemplateKey,
} from "../../utils/statementImport";
import {
  MAX_MONTH_PAYLOAD_BYTES,
  addBudgetAccount,
  addBudgetSplitOff,
  addBudgetTransaction,
  changeBudgetPassphrase,
  countBudgetAccountTransactions,
  countBudgetCategoryTransactions,
  createBudget,
  deleteBudgetAccount,
  deleteBudgetCategory,
  deleteBudgetRule,
  deleteBudgetRecurring,
  deleteBudgetTransaction,
  deleteBudgetTransactions,
  dismissBudgetPlanRecurring,
  editBudgetRule,
  getBudgetAccounts,
  getBudgetAccountsWithTransactions,
  getBudgetCategories,
  getBudgetPlan,
  getBudgetProfile,
  getBudgetRules,
  getBudgetRecurring,
  getAccountTransactions,
  getBudgetTransactions,
  getLastBudgetPlanBefore,
  getLockedBudget,
  importBudgetTransactions,
  linkBudgetRecurringOccurrence,
  linkBudgetRefund,
  removeBudgetSplitOff,
  makeBudgetTransactionRecurring,
  rememberFileAccountMappings,
  replaceRecoveryKey,
  saveImportTemplate,
  resetBudget,
  setBudgetPlanAmount,
  setBudgetMainCurrency,
  setMainBudgetAccount,
  startBudgetPlan,
  stopBudgetRecurring,
  unlinkBudgetRecurringOccurrence,
  unlinkBudgetRefund,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
  updateBudgetAccount,
  updateBudgetCategories,
  updateBudgetRecurringRule,
  updateBudgetSplitOff,
  updateBudgetTransactions,
} from "./endpoints";
import type {
  ImportTemplate,
  BudgetAccountDoc,
  BudgetCategoryTree,
  BudgetTransaction,
  BudgetTransactionInput,
  BudgetTransactionPatch,
  BudgetTransactionRef,
  CreateBudgetInput,
  RepeatRuleInput,
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
    await setBudgetPlanAmount(otherBudget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 100 });
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [account] = await getBudgetAccounts(budget);
    await addBudgetTransaction(budget, monthTransaction(account.id, "2026-10-02"));
    await addBudgetTransaction(budget, monthTransaction(account.id, "2026-11-02"));
    await setBudgetPlanAmount(budget, { month: "2026-10", type: "expense", categoryId: "cat-food", amount: 100 });
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "income", categoryId: "cat-salary", amount: 100 });
    await addBudgetTransaction(budget, { ...monthTransaction(account.id), categoryId: "cat-food", confirmed: true });
    expect(await read(`budget_rules/${ME}`)).toBeDefined();

    await resetBudget(ME);

    const plans = Object.values(await list("budget_plans"));
    expect(plans.map((plan) => plan.ownerId)).toEqual([OTHER]);

    const months = Object.values(await list("budget_months"));
    expect(months.map((month) => month.memberIds)).toEqual([[OTHER]]);

    expect(await read(`budget_keys/${ME}`)).toBeUndefined();
    expect(await read(`budget_profiles/${ME}`)).toBeUndefined();
    expect(await read(`budget_categories/${ME}`)).toBeUndefined();
    expect(await read(`budget_rules/${ME}`)).toBeUndefined();
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

// One edit through the bulk endpoint
const updateOne = async (budget: UnlockedBudget, ref: BudgetTransactionRef, patch: BudgetTransactionPatch) => {
  const [updated] = await updateBudgetTransactions(budget, [{ ref, patch }]);
  return updated;
};

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

    const edited = await updateOne(budget, first, { payee: "Renamed", amount: 3000, confirmed: false });

    expect(edited).toEqual({ ...first, payee: "Renamed", amount: 3000, confirmed: false });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([edited, second]);
  });

  it("moves a transaction to another month atomically, deleting the month it leaves empty", async () => {
    const { budget, accountId } = await setUp();
    const moved = await addBudgetTransaction(budget, transaction(accountId, { date: "2026-11-14" }));

    const edited = await updateOne(budget, moved, { date: "2026-12-02" });

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

    const edited = await updateOne(budget, moved, { accountId: savingsId, date: "2026-10-20" });

    expect(edited).toEqual({ ...moved, accountId: savingsId, date: "2026-10-20" });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([stays]);
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-10" })).toEqual([there, edited]);
  });

  it("never changes the frozen import fields of an imported transaction", async () => {
    const { budget, accountId } = await setUp();
    const imported = await addBudgetTransaction(
      budget,
      transaction(accountId, { sourceFile: "statement.csv", importHash: "frozen-hash", counterpartyAccount: "12345678" }),
    );
    // Not a fresh literal, so the extra fields get past the type, as a careless caller's object would
    const patch: BudgetTransactionPatch = Object.assign(
      { payee: "Fixed" },
      { importHash: "x", sourceFile: "y", counterpartyAccount: "z" },
    );

    const edited = await updateOne(budget, imported, patch);

    expect(edited).toMatchObject({
      payee: "Fixed",
      sourceFile: "statement.csv",
      importHash: "frozen-hash",
      counterpartyAccount: "12345678",
    });
    expect(await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).toEqual([edited]);

    // A bulk category change that also moves the row keeps them too
    const [moved] = await updateBudgetTransactions(budget, [
      { ref: edited, patch: { date: "2026-12-01", categoryId: "cat-food", confirmed: true } },
    ]);
    expect(moved).toMatchObject({ sourceFile: "statement.csv", importHash: "frozen-hash", counterpartyAccount: "12345678" });
    expect(await getBudgetTransactions(budget, { from: "2026-12", to: "2026-12" })).toEqual([moved]);
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

  it("imports many transactions into their months at once, keeping the import fields", async () => {
    const { budget, accountId } = await setUp();
    const kept = await addBudgetTransaction(budget, transaction(accountId));
    const imported = { importHash: "hash-1", sourceFile: "statement.csv", counterpartyAccount: "123" };

    const added = await importBudgetTransactions(budget, [
      transaction(accountId, { date: "2026-10-02", ...imported }),
      transaction(accountId, { date: "2026-11-20", payee: "Second" }),
    ]);

    expect(added).toHaveLength(2);
    expect(new Set(added.map(({ id }) => id)).size).toBe(2);
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-11" })).toEqual(
      expect.arrayContaining([kept, ...added]),
    );
    expect(added[0]).toMatchObject(imported);
    // One account's months, read document by document across a year boundary and gaps
    expect(await getAccountTransactions(budget, accountId, { from: "2025-12", to: "2026-11" })).toEqual(
      expect.arrayContaining([kept, ...added]),
    );
    expect(await getAccountTransactions(budget, accountId, { from: "2026-12", to: "2027-01" })).toEqual([]);
  });

  it("a multi-account Millennium import feeds several accounts; the mapping is remembered encrypted", async () => {
    const { budget, accountId: mainId } = await setUp();
    const savingsId = await addAccount(budget, "Savings");
    const CHECKING = "PL34 0215 8418 3495 1552 2867 9694";
    const SAVINGS = "PL12 9594 8546 4581 7280 7584 0369";
    const text = decodeStatementFile(
      new Uint8Array(
        readFileSync(resolve(__dirname, "../../../../../fixtures/bank-statements/millennium/millennium-2026-10.csv")),
      ),
    );
    const rows = parseStatementRows("millennium", (await readStatement(text)).records);
    const targets = { [CHECKING]: mainId, [SAVINGS]: savingsId };

    // As the import wizard does: one preview per Flaner account, then one import of every new row
    const { groups } = splitRowsByFileAccount(rows, targets);
    const previews = await Promise.all(
      groups.map(({ accountId, rows: groupRows }) =>
        buildImportPreview({
          rows: groupRows,
          accountId,
          fallbackCurrency: "PLN",
          mainCurrency: "PLN",
          fileName: "millennium-2026-10.csv",
          loadTransactions: (range) => getAccountTransactions(budget, accountId, range),
          getRate: () => Promise.reject(new Error("every row is in the main currency")),
        }),
      ),
    );
    const inputs = previews
      .flatMap((preview) => preview.rows)
      .map(({ transaction: { id: _previewId, ...rest } }): BudgetTransactionInput => rest);
    await importBudgetTransactions(budget, inputs);
    await rememberFileAccountMappings(budget, targets);

    const savingsRows = groups.find((group) => group.accountId === savingsId)?.rows.length ?? 0;
    expect(savingsRows).toBeGreaterThan(0);
    expect(await getAccountTransactions(budget, savingsId, { from: "2026-10", to: "2026-10" })).toHaveLength(savingsRows);
    expect(await getAccountTransactions(budget, mainId, { from: "2026-10", to: "2026-10" })).toHaveLength(30 - savingsRows);
    expect((await getBudgetProfile(budget))?.fileAccountMappings).toEqual(targets);
    expect(JSON.stringify(await read(`budget_profiles/${ME}`))).not.toContain("9694");

    // Next import skips the savings account: the remembered mapping is updated, the other entry kept
    await rememberFileAccountMappings(budget, { [SAVINGS]: null });
    expect((await getBudgetProfile(budget))?.fileAccountMappings).toEqual({ [CHECKING]: mainId, [SAVINGS]: null });
    // Re-previewing the same file per account finds only duplicates
    const again = await buildImportPreview({
      rows: groups[0].rows,
      accountId: groups[0].accountId,
      fallbackCurrency: "PLN",
      mainCurrency: "PLN",
      fileName: "millennium-2026-10.csv",
      loadTransactions: (monthRange) => getAccountTransactions(budget, groups[0].accountId, monthRange),
      getRate: () => Promise.reject(new Error("every row is in the main currency")),
    });
    expect(again.rows.every((row) => row.status !== "new")).toBe(true);
  });

  it("an import template is saved encrypted, recognizes its file, and survives other profile writes", async () => {
    const { budget, accountId } = await setUp();
    const savingsId = await addAccount(budget, "Savings");
    const text = '"Data","Kwota","Kontrahent","Tytuł"\r\n"03.11.2026","-12,50","Sklep Zielony","Zakupy"';
    const { bank, records } = await readStatement(text);
    expect(bank).toBeNull();

    const template: ImportTemplate = {
      name: "Pekao",
      header: records[0],
      columns: ["date", "amount", "payee", "description"],
      dateFormat: "DD.MM.YYYY",
      decimalSeparator: ",",
    };
    await saveImportTemplate(budget, template);
    const saved = (await getBudgetProfile(budget))?.importTemplates ?? [];
    expect(saved).toEqual([template]);
    expect(JSON.stringify(await read(`budget_profiles/${ME}`))).not.toContain("Kontrahent");

    // The next file of that kind is recognized and read by the template
    const recognized = findImportTemplate(saved, records[0]);
    expect(recognized?.name).toBe("Pekao");
    expect(recognized && parseTemplateRows(recognized, records)).toEqual([
      expect.objectContaining({ status: "ok", date: "2026-11-03", type: "expense", amount: 1250, payee: "Sklep Zielony" }),
    ]);

    // Remembering the template's account and deleting another account keep the templates
    await rememberFileAccountMappings(budget, { [importTemplateKey("Pekao")]: accountId });
    await deleteBudgetAccount(budget, savingsId);
    expect(await getBudgetProfile(budget)).toMatchObject({
      fileAccountMappings: { [importTemplateKey("Pekao")]: accountId },
      importTemplates: [template],
    });
  });

  it("fails an import as a whole when one month would exceed the size guard", async () => {
    const { budget, accountId } = await setUp();

    await expect(
      importBudgetTransactions(budget, [
        transaction(accountId, { date: "2026-10-02" }),
        transaction(accountId, { description: "x".repeat(MAX_MONTH_PAYLOAD_BYTES) }),
      ]),
    ).rejects.toThrow("planning:errors.budget.importTooLarge");
    expect(await getBudgetTransactions(budget, { from: "2026-10", to: "2026-11" })).toEqual([]);
  });

  it("denies another user", async () => {
    const { budget, accountId } = await setUp();
    const added = await addBudgetTransaction(budget, transaction(accountId));

    await signInAs(OTHER);
    await expect(getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" })).rejects.toMatchObject(DENIED);
    await expect(addBudgetTransaction(budget, transaction(accountId))).rejects.toMatchObject(DENIED);
    await expect(deleteBudgetTransaction(budget, added)).rejects.toMatchObject(DENIED);
    await expect(updateOne(budget, added, { date: "2026-12-01" })).rejects.toMatchObject(DENIED);
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

describe("budget plans", () => {
  const setUp = async (): Promise<UnlockedBudget> => {
    await signInAs(ME);
    return createBudget(ME, input());
  };

  it("a month without a plan reads as null", async () => {
    const budget = await setUp();

    expect(await getBudgetPlan(budget, "2026-11")).toBeNull();
  });

  it("round-trips limits and planned income encrypted: no readable amount or category id is stored", async () => {
    const budget = await setUp();

    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 150075 });
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "sub-groceries", amount: 90000 });
    const saved = await setBudgetPlanAmount(budget, {
      month: "2026-11",
      type: "income",
      categoryId: "cat-salary",
      amount: 845000,
    });

    const expected = {
      month: "2026-11",
      limits: { "cat-food": 150075, "sub-groceries": 90000 },
      plannedIncome: { "cat-salary": 845000 },
    };
    expect(saved).toEqual(expected);
    expect(await getBudgetPlan(budget, "2026-11")).toEqual(expected);
    expect(await getBudgetPlan(budget, "2026-12")).toBeNull();

    const stored = await read(`budget_plans/${ME}_2026-11`);
    expect(stored).toEqual({ ownerId: ME, month: "2026-11", payload: expect.anything(), updatedAt: expect.any(Number) });
    const raw = JSON.stringify(stored);
    for (const secret of ["150075", "90000", "845000", "cat-food", "sub-groceries", "cat-salary"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("changes and removes one amount, leaving the others", async () => {
    const budget = await setUp();
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 1000 });
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "sub-groceries", amount: 500 });

    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 2000 });
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "sub-groceries", amount: null });

    expect(await getBudgetPlan(budget, "2026-11")).toEqual({
      month: "2026-11",
      limits: { "cat-food": 2000 },
      plannedIncome: {},
    });
  });

  it("starts a month's plan once, finds the last planned month before it and dismisses banners per month", async () => {
    const budget = await setUp();
    expect(await getLastBudgetPlanBefore(budget, "2026-11")).toBeNull();

    const september = { month: "2026-09", limits: { "cat-food": 1000 }, plannedIncome: {} };
    await startBudgetPlan(budget, september);
    await startBudgetPlan(budget, { month: "2026-10", limits: {}, plannedIncome: { "cat-salary": 5000 } });
    await startBudgetPlan(budget, { month: "2026-12", limits: {}, plannedIncome: {} });
    await expect(startBudgetPlan(budget, september)).rejects.toThrow("planning:errors.budget.planAlreadyStarted");

    expect(await getLastBudgetPlanBefore(budget, "2026-11")).toEqual({
      month: "2026-10",
      limits: {},
      plannedIncome: { "cat-salary": 5000 },
    });
    expect(await getLastBudgetPlanBefore(budget, "2026-10")).toEqual(september);

    await dismissBudgetPlanRecurring(budget, { month: "2026-09", recurringId: "rec-1" });
    // Saving an amount keeps the dismissed banners
    await setBudgetPlanAmount(budget, { month: "2026-09", type: "expense", categoryId: "cat-food", amount: 2000 });
    expect(await getBudgetPlan(budget, "2026-09")).toEqual({
      month: "2026-09",
      limits: { "cat-food": 2000 },
      plannedIncome: {},
      dismissedRecurring: ["rec-1"],
    });
    expect(JSON.stringify(await read(`budget_plans/${ME}_2026-09`))).not.toContain("rec-1");
    await expect(dismissBudgetPlanRecurring(budget, { month: "2026-11", recurringId: "rec-1" })).rejects.toThrow(
      "planning:errors.budget.planMissing",
    );
  });

  it("denies another user", async () => {
    const budget = await setUp();
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 1000 });

    await signInAs(OTHER);
    await expect(getBudgetPlan(budget, "2026-11")).rejects.toMatchObject(DENIED);
    await expect(
      setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 1 }),
    ).rejects.toMatchObject(DENIED);
    await expect(getBudgetPlan(budget, "2026-12")).rejects.toMatchObject(DENIED);
    await expect(getLastBudgetPlanBefore(budget, "2026-12")).rejects.toMatchObject(DENIED);
    await expect(startBudgetPlan(budget, { month: "2026-12", limits: {}, plannedIncome: {} })).rejects.toMatchObject(DENIED);
  });
});

describe("budget split-offs, exclusion and refunds", () => {
  const setUp = async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input({ mainAccount: { name: "Main", currency: "PLN" } }));
    const [main] = await getBudgetAccounts(budget);
    return { budget, mainId: main.id };
  };

  const purchaseOf = (accountId: string, date = "2026-11-14") => ({
    ...monthTransaction(accountId, date),
    amount: 10000,
    amountMain: 10000,
    categoryId: "sub-groceries",
  });

  const refundOf = (accountId: string, date: string, amount = 2000): BudgetTransactionInput => ({
    ...monthTransaction(accountId, date),
    type: "income",
    amount,
    amountMain: amount,
    payee: "Shop refund",
    categoryId: "cat-salary",
  });

  const all = (budget: UnlockedBudget) => getBudgetTransactions(budget, { from: "2026-01", to: "2026-12" });
  const byId = async (budget: UnlockedBudget, id: string): Promise<BudgetTransaction | undefined> =>
    (await all(budget)).find((stored) => stored.id === id);
  const linkOf = (refund: BudgetTransaction) => ({
    transactionId: refund.id,
    accountId: refund.accountId,
    month: refund.date.slice(0, 7),
  });

  it("adds, edits, excludes and removes split-offs; their sum stays below the total", async () => {
    const { budget, mainId } = await setUp();
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId));

    const lamp = await addBudgetSplitOff(budget, purchase, { amount: 3000, categoryId: "cat-food", note: "Lamp" });
    await updateBudgetSplitOff(budget, purchase, lamp.id, { amount: 2500, note: "Desk lamp", excluded: true });
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([
      { ...lamp, amount: 2500, note: "Desk lamp", excluded: true },
    ]);

    await expect(
      addBudgetSplitOff(budget, purchase, { amount: 7500, categoryId: null, note: "" }),
    ).rejects.toThrow("planning:errors.budget.splitOffsTooLarge");
    await expect(updateBudgetTransactions(budget, [{ ref: purchase, patch: { amount: 2500 } }])).rejects.toThrow(
      "planning:errors.budget.splitOffsTooLarge",
    );
    await expect(updateBudgetTransactions(budget, [{ ref: purchase, patch: { type: "income" } }])).rejects.toThrow(
      "planning:errors.budget.splitTypeLocked",
    );

    await removeBudgetSplitOff(budget, purchase, lamp.id);
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([]);
  });

  it("excludes and restores transactions in bulk", async () => {
    const { budget, mainId } = await setUp();
    const a = await addBudgetTransaction(budget, monthTransaction(mainId, "2026-10-01"));
    const b = await addBudgetTransaction(budget, monthTransaction(mainId, "2026-11-01"));

    await updateBudgetTransactions(budget, [a, b].map((ref) => ({ ref, patch: { excluded: true } })));
    expect((await all(budget)).map((stored) => stored.excluded)).toEqual([true, true]);
    await updateBudgetTransactions(budget, [a, b].map((ref) => ({ ref, patch: { excluded: false } })));
    expect((await all(budget)).map((stored) => stored.excluded)).toEqual([false, false]);
  });

  it("links a refund across months and accounts: an excluded split-off on the purchase, the refund excluded; unlink restores both", async () => {
    const { budget, mainId } = await setUp();
    const card = await addBudgetAccount(budget, { name: "Card", defaultCurrency: "PLN" });
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId, "2026-10-30"));
    const refund = await addBudgetTransaction(budget, refundOf(card.id, "2026-11-04"));

    await linkBudgetRefund(budget, { purchase, refund, amount: 2000 });

    const linkedPurchase = await byId(budget, purchase.id);
    const [refundSplitOff] = linkedPurchase?.splitOffs ?? [];
    expect(refundSplitOff).toMatchObject({
      amount: 2000,
      categoryId: "sub-groceries",
      excluded: true,
      refund: { transactionId: refund.id, accountId: card.id, month: "2026-11" },
    });
    expect(await byId(budget, refund.id)).toMatchObject({
      excluded: true,
      refundOf: { transactionId: purchase.id, accountId: mainId, month: "2026-10", splitOffId: refundSplitOff.id },
    });

    // Locked while linked
    const linkedRefund = await byId(budget, refund.id);
    if (!linkedRefund) throw new Error("refund missing");
    await expect(updateBudgetTransactions(budget, [{ ref: linkedRefund, patch: { amount: 1000 } }])).rejects.toThrow(
      "planning:errors.budget.linkedLocked",
    );
    await expect(
      updateBudgetSplitOff(budget, purchase, refundSplitOff.id, { amount: 1000 }),
    ).rejects.toThrow("planning:errors.budget.linkedLocked");
    await expect(
      updateBudgetTransactions(budget, [{ ref: purchase, patch: { date: "2026-09-30" } }]),
    ).rejects.toThrow("planning:errors.budget.linkedLocked");
    // Not even within the month: a refund never predates its purchase
    await expect(
      updateBudgetTransactions(budget, [{ ref: linkedRefund, patch: { date: "2026-11-01" } }]),
    ).rejects.toThrow("planning:errors.budget.linkedLocked");

    await unlinkBudgetRefund(budget, linkOf(linkedRefund));
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([]);
    const released = await byId(budget, refund.id);
    expect(released?.excluded).toBe(false);
    expect(released?.refundOf).toBeUndefined();
  });

  it("carves a refund out of a split-off and returns it there on unlink", async () => {
    const { budget, mainId } = await setUp();
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId));
    const lamp = await addBudgetSplitOff(budget, purchase, { amount: 5000, categoryId: "cat-food", note: "Lamp" });
    const refund = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-20", 1500));

    await linkBudgetRefund(budget, { purchase, splitOffId: lamp.id, refund, amount: 1500 });
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([
      { ...lamp, amount: 3500 },
      expect.objectContaining({ amount: 1500, categoryId: "cat-food", parentSplitOffId: lamp.id, excluded: true }),
    ]);

    await unlinkBudgetRefund(budget, linkOf(refund));
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([lamp]);
  });

  it("refuses refunds that do not qualify", async () => {
    const { budget, mainId } = await setUp();
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId, "2026-11-14"));
    const before = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-13"));
    const tooBig = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-15", 10000));
    const expense = await addBudgetTransaction(budget, monthTransaction(mainId, "2026-11-15"));
    const refusal = "planning:errors.budget.refundNotAllowed";

    await expect(linkBudgetRefund(budget, { purchase, refund: before, amount: 2000 })).rejects.toThrow(refusal);
    await expect(linkBudgetRefund(budget, { purchase, refund: tooBig, amount: 10000 })).rejects.toThrow(refusal);
    await expect(linkBudgetRefund(budget, { purchase, refund: expense, amount: 1000 })).rejects.toThrow(refusal);
  });

  it("deleting either side cleans up the other, across months", async () => {
    const { budget, mainId } = await setUp();
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId, "2026-10-30"));
    const refund = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-04"));
    await linkBudgetRefund(budget, { purchase, refund, amount: 2000 });

    await deleteBudgetTransaction(budget, refund);
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([]);

    const secondRefund = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-05"));
    await linkBudgetRefund(budget, { purchase, refund: secondRefund, amount: 2000 });
    await deleteBudgetTransaction(budget, purchase);
    const released = await byId(budget, secondRefund.id);
    expect(released).toMatchObject({ excluded: false });
    expect(released?.refundOf).toBeUndefined();
  });

  it("removing a refund split-off unlinks the refund", async () => {
    const { budget, mainId } = await setUp();
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId, "2026-10-30"));
    const refund = await addBudgetTransaction(budget, refundOf(mainId, "2026-11-04"));
    await linkBudgetRefund(budget, { purchase, refund, amount: 2000 });
    const [refundSplitOff] = (await byId(budget, purchase.id))?.splitOffs ?? [];

    await removeBudgetSplitOff(budget, purchase, refundSplitOff.id);
    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([]);
    expect(await byId(budget, refund.id)).toMatchObject({ excluded: false });
  });

  it("deleting an account unlinks refunds pointing into it", async () => {
    const { budget, mainId } = await setUp();
    const card = await addBudgetAccount(budget, { name: "Card", defaultCurrency: "PLN" });
    const purchase = await addBudgetTransaction(budget, purchaseOf(mainId, "2026-10-30"));
    const refund = await addBudgetTransaction(budget, refundOf(card.id, "2026-11-04"));
    const cardPurchase = await addBudgetTransaction(budget, purchaseOf(card.id, "2026-09-01"));
    const mainRefund = await addBudgetTransaction(budget, refundOf(mainId, "2026-09-02"));
    await linkBudgetRefund(budget, { purchase, refund, amount: 2000 });
    await linkBudgetRefund(budget, { purchase: cardPurchase, refund: mainRefund, amount: 2000 });

    await deleteBudgetAccount(budget, card.id);

    expect((await byId(budget, purchase.id))?.splitOffs).toEqual([]);
    expect(await byId(budget, mainRefund.id)).toMatchObject({ excluded: false });
    expect((await byId(budget, mainRefund.id))?.refundOf).toBeUndefined();
  });
});

describe("budget recurring transactions", () => {
  // Relative to the real today: matching looks ahead to the end of next month and an edit starts today
  const dayIn = (monthsFromNow: number, day: number) => format(setDate(addMonths(new Date(), monthsFromNow), day), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const monthlyOn10th: RepeatRuleInput = { pattern: { frequency: "monthly", interval: 1, day: 10 }, end: { type: "never" } };

  const rent = (accountId: string, date: string): BudgetTransactionInput => ({
    ...monthTransaction(accountId, date),
    payee: "Secret Landlord",
    categoryId: "cat-food",
    amount: 250000,
    amountMain: 250000,
  });

  const setUp = async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [account] = await getBudgetAccounts(budget);
    return { budget, accountId: account.id };
  };

  const matchedIds = async (budget: UnlockedBudget) => {
    const [recurring] = await getBudgetRecurring(budget);
    return Object.fromEntries(
      Object.entries(recurring.occurrences).map(([dueDate, match]) => [dueDate, match.transactionId]),
    );
  };

  it("makes a transaction the first occurrence, stores nothing readable and matches later transactions", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, rent(accountId, dayIn(-2, 10)));
    const later = await addBudgetTransaction(budget, rent(accountId, dayIn(-1, 12)));
    await addBudgetTransaction(budget, { ...rent(accountId, dayIn(-1, 11)), payee: "Someone else" });

    const recurring = await makeBudgetTransactionRecurring(budget, first, monthlyOn10th);

    expect(recurring).toEqual(
      expect.objectContaining({ accountId, payee: "Secret Landlord", amount: 250000, rule: expect.objectContaining({ start: first.date }) }),
    );
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(-1, 10)]: later.id });
    const stored = JSON.stringify(await read(`budget_recurring/${accountId}`));
    expect(stored).not.toContain("Secret Landlord");
    expect(stored).not.toContain("250000");
    await expect(makeBudgetTransactionRecurring(budget, first, monthlyOn10th)).rejects.toThrow(
      "planning:errors.budget.alreadyRecurring",
    );
    // The first occurrence must stay within the matching window of the transaction
    const other = await addBudgetTransaction(budget, { ...rent(accountId, dayIn(-1, 1)), payee: "Other" });
    await expect(
      makeBudgetTransactionRecurring(budget, other, { pattern: { frequency: "monthly", interval: 1, day: 28 }, end: { type: "never" } }),
    ).rejects.toThrow("planning:errors.budget.recurringFirstTooFar");

    // A transaction added later matches by itself
    const next = await addBudgetTransaction(budget, rent(accountId, dayIn(0, 8)));
    expect(await matchedIds(budget)).toEqual(
      expect.objectContaining({ [dayIn(0, 10)]: next.id, [dayIn(-1, 10)]: later.id }),
    );
  });

  it("updates the matches when a matched transaction is deleted or re-dated, keeping the recurring transaction", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, rent(accountId, dayIn(-2, 10)));
    const later = await addBudgetTransaction(budget, rent(accountId, dayIn(-1, 12)));
    const current = await addBudgetTransaction(budget, rent(accountId, dayIn(0, 9)));
    await makeBudgetTransactionRecurring(budget, first, monthlyOn10th);

    await deleteBudgetTransaction(budget, later);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(0, 10)]: current.id });

    await updateBudgetTransactions(budget, [{ ref: current, patch: { date: dayIn(1, 11) } }]);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(1, 10)]: current.id });

    // Another category: no longer the same recurring payment
    await updateBudgetTransactions(budget, [{ ref: { ...current, date: dayIn(1, 11) }, patch: { categoryId: null } }]);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id });
  });

  it("edits the rule from today keeping earlier matches, stops and deletes", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, rent(accountId, dayIn(-2, 10)));
    const recurring = await makeBudgetTransactionRecurring(budget, first, monthlyOn10th);

    const on20th: RepeatRuleInput = { pattern: { frequency: "monthly", interval: 1, day: 20 }, end: { type: "after", count: 3 } };
    await updateBudgetRecurringRule(budget, recurring, on20th);
    const [edited] = await getBudgetRecurring(budget);
    expect(edited.rule).toEqual(expect.objectContaining({ pattern: on20th.pattern, start: today }));
    expect(edited.rule.end).toEqual(expect.objectContaining({ type: "after", count: 3 }));
    expect(edited.occurrences[dayIn(-2, 10)].transactionId).toBe(first.id);

    await stopBudgetRecurring(budget, recurring);
    const [stopped] = await getBudgetRecurring(budget);
    expect(stopped.rule.end.type).toBe("until");
    // Stop never moves an earlier end later
    await updateBudgetRecurringRule(budget, recurring, { pattern: on20th.pattern, end: { type: "until", date: dayIn(-1, 1) } });
    await stopBudgetRecurring(budget, recurring);
    expect((await getBudgetRecurring(budget))[0].rule.end).toEqual({ type: "until", date: dayIn(-1, 1) });
    expect(stopped.occurrences[dayIn(-2, 10)].transactionId).toBe(first.id);

    await deleteBudgetRecurring(budget, recurring);
    expect(await getBudgetRecurring(budget)).toEqual([]);
    expect(await read(`budget_recurring/${accountId}`)).toBeUndefined();
    // The transaction stays
    expect(await getBudgetTransactions(budget, { from: "2000-01", to: "2100-12" })).toEqual([first]);
  });

  it("links an unpaid occurrence by hand and unlinks a paid one; both stick through automatic re-matching", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, rent(accountId, dayIn(-2, 10)));
    const auto = await addBudgetTransaction(budget, rent(accountId, dayIn(-1, 11)));
    // Another payee, 15 days after the due date: automatic matching never picks it
    const manual = await addBudgetTransaction(budget, { ...rent(accountId, dayIn(-1, 25)), payee: "Landlord's agent" });
    const recurring = await makeBudgetTransactionRecurring(budget, first, monthlyOn10th);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(-1, 10)]: auto.id });

    await unlinkBudgetRecurringOccurrence(budget, recurring, dayIn(-1, 10));
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id });
    await expect(
      linkBudgetRecurringOccurrence(budget, recurring, { dueDate: dayIn(-1, 10), transaction: first }),
    ).rejects.toThrow("planning:errors.budget.alreadyMatched");

    await linkBudgetRecurringOccurrence(budget, recurring, { dueDate: dayIn(-1, 10), transaction: manual });
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(-1, 10)]: manual.id });
    await expect(
      linkBudgetRecurringOccurrence(budget, recurring, { dueDate: dayIn(-1, 10), transaction: auto }),
    ).rejects.toThrow("planning:errors.budget.occurrenceAlreadyPaid");

    // A write near the occurrence re-matches it: the manual link stays
    await updateBudgetTransactions(budget, [{ ref: auto, patch: { description: "touched" } }]);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id, [dayIn(-1, 10)]: manual.id });
    expect(JSON.stringify(await read(`budget_recurring/${accountId}`))).not.toContain(manual.id);

    // Deleting the linked transaction frees the occurrence; the unlinked one is never matched to it again
    await deleteBudgetTransaction(budget, manual);
    expect(await matchedIds(budget)).toEqual({ [dayIn(-2, 10)]: first.id });
  });

  it("is removed by deleting its account and by Reset budget", async () => {
    const { budget, accountId } = await setUp();
    const other = await addBudgetAccount(budget, { name: "Other", defaultCurrency: "PLN" });
    await makeBudgetTransactionRecurring(budget, await addBudgetTransaction(budget, rent(other.id, dayIn(-1, 10))), monthlyOn10th);
    await makeBudgetTransactionRecurring(budget, await addBudgetTransaction(budget, rent(accountId, dayIn(-1, 10))), monthlyOn10th);

    await deleteBudgetAccount(budget, other.id);
    expect(Object.keys(await list("budget_recurring"))).toEqual([accountId]);
    // An account without recurring transactions deletes too
    await deleteBudgetAccount(budget, (await addBudgetAccount(budget, { name: "Empty", defaultCurrency: "PLN" })).id);

    await resetBudget(ME);
    expect(await list("budget_recurring")).toEqual({});
  });

  it("denies another user", async () => {
    const { budget, accountId } = await setUp();
    const first = await addBudgetTransaction(budget, rent(accountId, dayIn(-1, 10)));
    const recurring = await makeBudgetTransactionRecurring(budget, first, monthlyOn10th);

    await signInAs(OTHER);
    await expect(getBudgetRecurring({ ...budget, uid: OTHER })).resolves.toEqual([]);
    await expect(getBudgetRecurring(budget)).rejects.toMatchObject(DENIED);
    await expect(deleteBudgetRecurring(budget, recurring)).rejects.toMatchObject(DENIED);
  });
});

describe("budget categorization rules", () => {
  const setUp = async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [account] = await getBudgetAccounts(budget);
    return { budget, account };
  };

  const shop = (accountId: string, overrides: Partial<BudgetTransactionInput> = {}): BudgetTransactionInput => ({
    ...monthTransaction(accountId),
    payee: "Biedronka 1234 Warszawa",
    ...overrides,
  });

  it("a manual transaction with a category teaches a keyword rule, stored encrypted", async () => {
    const { budget, account } = await setUp();
    expect(await getBudgetRules(budget)).toEqual([]);

    await addBudgetTransaction(budget, shop(account.id, { categoryId: "sub-groceries", confirmed: true }));

    expect(await getBudgetRules(budget)).toEqual([
      { kind: "keyword", key: "biedronka warszawa", type: "expense", categoryId: "sub-groceries" },
    ]);
    const stored = await read(`budget_rules/${ME}`);
    expect(stored).toEqual({ payload: expect.anything(), updatedAt: expect.any(Number) });
    const raw = JSON.stringify(stored);
    for (const secret of ["biedronka", "sub-groceries", "keyword"]) expect(raw).not.toContain(secret);
  });

  it("an import teaches from rows changed in the preview (confirmed), not from untouched guesses", async () => {
    const { budget, account } = await setUp();

    await importBudgetTransactions(budget, [
      shop(account.id, { payee: "Lidl", categoryId: "sub-groceries", confirmed: false }),
      shop(account.id, { payee: "Landlord", counterpartyAccount: "PL61 1090 1014", categoryId: "cat-food", confirmed: true }),
    ]);

    expect(await getBudgetRules(budget)).toEqual([
      { kind: "accountNumber", key: "6110901014", type: "expense", categoryId: "cat-food", payee: "Landlord" },
    ]);
  });

  it("changing a category on the list teaches; confirming or clearing teaches nothing", async () => {
    const { budget, account } = await setUp();
    const guessed = await addBudgetTransaction(budget, shop(account.id, { categoryId: "cat-food", confirmed: false }));
    expect(await getBudgetRules(budget)).toEqual([]);

    await updateBudgetTransactions(budget, [{ ref: guessed, patch: { confirmed: true } }]);
    await updateBudgetTransactions(budget, [{ ref: guessed, patch: { categoryId: null, confirmed: false } }]);
    expect(await getBudgetRules(budget)).toEqual([]);

    await updateBudgetTransactions(budget, [{ ref: guessed, patch: { categoryId: "sub-groceries", confirmed: true } }]);
    await updateBudgetTransactions(budget, [{ ref: guessed, patch: { categoryId: "cat-food", confirmed: true } }]);

    expect(await getBudgetRules(budget)).toEqual([
      { kind: "keyword", key: "biedronka warszawa", type: "expense", categoryId: "cat-food" },
    ]);
  });

  it("never re-categorizes stored transactions", async () => {
    const { budget, account } = await setUp();
    const first = await addBudgetTransaction(budget, shop(account.id, { categoryId: "cat-food", confirmed: true }));
    const second = await addBudgetTransaction(budget, shop(account.id));

    await updateBudgetTransactions(budget, [{ ref: first, patch: { categoryId: "sub-groceries", confirmed: true } }]);

    const stored = await getBudgetTransactions(budget, { from: "2026-11", to: "2026-11" });
    expect(stored.find(({ id }) => id === second.id)).toMatchObject({ categoryId: null, confirmed: false });
  });

  it("Settings edits and deletes a rule", async () => {
    const { budget, account } = await setUp();
    await addBudgetTransaction(budget, shop(account.id, { categoryId: "cat-food", confirmed: true }));
    await addBudgetTransaction(budget, shop(account.id, { payee: "Rent", categoryId: "cat-food", confirmed: true }));

    await editBudgetRule(budget, "keyword:expense:biedronka warszawa", { key: "biedronka", categoryId: "sub-groceries" });
    await deleteBudgetRule(budget, "keyword:expense:rent");

    expect(await getBudgetRules(budget)).toEqual([
      { kind: "keyword", key: "biedronka", type: "expense", categoryId: "sub-groceries" },
    ]);
  });

  it("denies another user", async () => {
    const { budget, account } = await setUp();
    await addBudgetTransaction(budget, shop(account.id, { categoryId: "cat-food", confirmed: true }));

    await signInAs(OTHER);
    await expect(getBudgetRules(budget)).rejects.toMatchObject(DENIED);
    await expect(deleteBudgetRule(budget, "keyword:expense:biedronka warszawa")).rejects.toMatchObject(DENIED);
  });
});

describe("budget category tree", () => {
  const today = format(new Date(), "yyyy-MM-dd");

  const shop = (accountId: string, overrides: Partial<BudgetTransactionInput> = {}): BudgetTransactionInput => ({
    ...monthTransaction(accountId),
    payee: "Biedronka 1234 Warszawa",
    categoryId: "sub-groceries",
    confirmed: true,
    ...overrides,
  });

  // Expense: Shopping (Groceries), Home (Rent); a second account; a rule, a recurring transaction and a plan on Shopping
  const setUp = async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());
    const [main] = await getBudgetAccounts(budget);
    const card = await addBudgetAccount(budget, { name: "Card", defaultCurrency: "PLN" });
    await updateBudgetCategories(budget, (tree) =>
      addSubcategory(
        addCategory(tree, "expense", { id: "cat-home", name: "Home", icon: "house", color: 2 }),
        { type: "expense", categoryId: "cat-home" },
        { id: "sub-rent", name: "Rent" },
      ),
    );

    const groceries = await addBudgetTransaction(budget, shop(main.id, { date: "2026-10-03" }));
    const split = await addBudgetTransaction(budget, shop(card.id, { payee: "Ikea", categoryId: "cat-home" }));
    const lamp = await addBudgetSplitOff(budget, split, { amount: 300, categoryId: "cat-food", note: "Lamp" });
    const other = await addBudgetTransaction(budget, shop(card.id, { payee: "Landlord", categoryId: "sub-rent" }));
    const monthly = await addBudgetTransaction(budget, shop(main.id, { date: today, payee: "Gym", categoryId: "cat-food" }));
    await makeBudgetTransactionRecurring(budget, monthly, {
      pattern: { frequency: "monthly", interval: 1, day: Number(today.slice(8)) },
      end: { type: "never" },
    });
    await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "cat-food", amount: 1000 });

    return { budget, groceries, split, lamp, other, monthly };
  };

  const byId = async (budget: UnlockedBudget, id: string) =>
    (await getBudgetTransactions(budget, { from: "2026-01", to: "2099-12" })).find((stored) => stored.id === id);

  it("edits, reorders and stores the tree encrypted", async () => {
    await signInAs(ME);
    const budget = await createBudget(ME, input());

    await updateBudgetCategories(budget, (tree) =>
      addCategory(tree, "expense", { id: "cat-secret", name: "Secret hobby", icon: "gamepad-2", color: 4 }),
    );
    const saved = await updateBudgetCategories(budget, (tree) =>
      reorderCategories(tree, "expense", null, "cat-secret", "cat-food"),
    );

    expect(saved.expense.map(({ id }) => id)).toEqual(["cat-secret", "cat-food"]);
    expect(await getBudgetCategories(budget)).toEqual(saved);
    expect(JSON.stringify(await read(`budget_categories/${ME}`))).not.toContain("Secret hobby");
  });

  it("counts the transactions using a category and its subcategories, split-offs included", async () => {
    const { budget } = await setUp();

    expect(await countBudgetCategoryTransactions(budget, ["cat-food", "sub-groceries"])).toBe(3);
    expect(await countBudgetCategoryTransactions(budget, ["sub-rent"])).toBe(1);
  });

  it("with a replacement moves transactions, split-offs, recurring transactions and rules to it", async () => {
    const { budget, groceries, split, lamp, other, monthly } = await setUp();

    const tree = await deleteBudgetCategory(budget, { type: "expense", categoryId: "cat-food", replacementId: "sub-rent" });

    expect(tree.expense.map(({ id }) => id)).toEqual(["cat-home"]);
    expect(await getBudgetCategories(budget)).toEqual(tree);
    expect(await byId(budget, groceries.id)).toMatchObject({ categoryId: "sub-rent", confirmed: true });
    expect(await byId(budget, monthly.id)).toMatchObject({ categoryId: "sub-rent", confirmed: true });
    expect(await byId(budget, split.id)).toMatchObject({
      categoryId: "cat-home",
      splitOffs: [{ ...lamp, categoryId: "sub-rent" }],
    });
    expect(await byId(budget, other.id)).toMatchObject({ categoryId: "sub-rent" });
    const [recurring] = await getBudgetRecurring(budget);
    expect(recurring).toMatchObject({ categoryId: "sub-rent", occurrences: { [today]: { transactionId: monthly.id } } });
    expect((await getBudgetRules(budget)).map(({ key, categoryId }) => [key, categoryId])).toEqual(
      expect.arrayContaining([
        ["biedronka warszawa", "sub-rent"],
        ["gym", "sub-rent"],
      ]),
    );
    expect(await countBudgetCategoryTransactions(budget, ["cat-food", "sub-groceries"])).toBe(0);

    // The deleted category's limit drops out on the plan's next save; the replacement keeps its own
    const plan = await setBudgetPlanAmount(budget, { month: "2026-11", type: "expense", categoryId: "sub-rent", amount: 50 });
    expect(plan.limits).toEqual({ "sub-rent": 50 });
  });

  it("without a replacement leaves transactions Uncategorized and unconfirmed and deletes the rules", async () => {
    const { budget, groceries, split, lamp, monthly } = await setUp();

    const tree = await deleteBudgetCategory(budget, { type: "expense", categoryId: "sub-groceries", replacementId: null });

    expect(tree.expense[0]).toMatchObject({ id: "cat-food", subcategories: [] });
    expect(await byId(budget, groceries.id)).toMatchObject({ categoryId: null, confirmed: false });
    // Not on the deleted subcategory: unchanged
    expect(await byId(budget, monthly.id)).toMatchObject({ categoryId: "cat-food", confirmed: true });
    expect((await byId(budget, split.id))?.splitOffs).toEqual([lamp]);
    expect((await getBudgetRules(budget)).map(({ key }) => key)).toEqual(["ikea", "landlord", "gym"]);

    await deleteBudgetCategory(budget, { type: "expense", categoryId: "cat-food", replacementId: null });
    expect((await byId(budget, split.id))?.splitOffs).toEqual([{ ...lamp, categoryId: null }]);
    expect(await byId(budget, split.id)).toMatchObject({ categoryId: "cat-home", confirmed: true });
    const [recurring] = await getBudgetRecurring(budget);
    expect(recurring).toMatchObject({ categoryId: null, occurrences: { [today]: { transactionId: monthly.id } } });
  });

  it("refuses a missing category or a replacement that is deleted with it or of the other type", async () => {
    const { budget } = await setUp();
    const missing = "planning:errors.budget.categoryMissing";

    await expect(
      deleteBudgetCategory(budget, { type: "expense", categoryId: "nope", replacementId: null }),
    ).rejects.toThrow(missing);
    await expect(
      deleteBudgetCategory(budget, { type: "expense", categoryId: "cat-food", replacementId: "sub-groceries" }),
    ).rejects.toThrow(missing);
    await expect(
      deleteBudgetCategory(budget, { type: "expense", categoryId: "cat-food", replacementId: "cat-salary" }),
    ).rejects.toThrow(missing);
    expect((await getBudgetCategories(budget))?.expense.map(({ id }) => id)).toEqual(["cat-food", "cat-home"]);
  });

  it("denies another user", async () => {
    const { budget } = await setUp();

    await signInAs(OTHER);
    await expect(updateBudgetCategories(budget, (tree) => tree)).rejects.toMatchObject(DENIED);
    await expect(
      deleteBudgetCategory(budget, { type: "expense", categoryId: "cat-food", replacementId: null }),
    ).rejects.toMatchObject(DENIED);
  });
});
