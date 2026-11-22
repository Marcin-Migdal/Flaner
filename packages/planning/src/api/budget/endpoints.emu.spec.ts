// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import { generateRecoveryKey } from "../../utils/budgetCrypto";
import {
  changeBudgetPassphrase,
  createBudget,
  getBudgetAccounts,
  getBudgetCategories,
  getBudgetProfile,
  getLockedBudget,
  replaceRecoveryKey,
  resetBudget,
  unlockWithPassphrase,
  unlockWithRecoveryKey,
} from "./endpoints";
import type { BudgetCategoryTree, CreateBudgetInput } from "./types";

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
    await createBudget(OTHER, input());
    await signInAs(ME);
    await createBudget(ME, input());

    await resetBudget(ME);

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
