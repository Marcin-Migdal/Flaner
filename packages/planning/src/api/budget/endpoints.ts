// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/budget_*.md (keep their Write flows / Queries in sync).
// The only code touching `budget_*` collections (ADR 0002): callers get decrypted domain objects and pass the unlocked
// budget back in; encryption, document ids and transactions stay in here.
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import {
  Bytes,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import {
  KDF_ITERATIONS,
  decryptJson,
  derivePassphraseKey,
  deriveRecoveryKey,
  encryptJson,
  generateDataKey,
  generateSalt,
  parseRecoveryKey,
  unwrapDataKey,
  wrapDataKey,
} from "../../utils/budgetCrypto";
import { deleteRule, editRule, learnRule, type RuleSubject } from "../../utils/categorizationRules";
import { monthOfDate } from "../../utils/monthLedger";
import { linkRefOf, refundRoom, splitRest } from "../../utils/splitOffs";
import {
  MATCH_WINDOW_DAYS,
  daysApart,
  recurringTransactionIds,
  rematchRecurring,
  toMatch,
} from "../../utils/recurringTransactions";
import { endOfNextMonth, nextOccurrence, resolveRepeatEnd, shiftDay, todayDay } from "../../utils/repeatRules";
import { withImportTemplate } from "../../utils/statementImport/importTemplate";
import type {
  BudgetAccount,
  BudgetAccountChanges,
  BudgetAccountDoc,
  BudgetAccountInput,
  BudgetAccountPayload,
  BudgetCategoriesDoc,
  BudgetCategoryTree,
  BudgetKeysDoc,
  BudgetLinkRef,
  BudgetMonth,
  BudgetMonthDoc,
  BudgetMonthPayload,
  BudgetPlan,
  BudgetPlanAmountInput,
  BudgetPlanDoc,
  BudgetPlanPayload,
  BudgetProfile,
  BudgetProfileDoc,
  BudgetProfilePayload,
  BudgetRefundLinkInput,
  BudgetSplitOff,
  BudgetSplitOffInput,
  BudgetSplitOffPatch,
  BudgetRule,
  BudgetRuleChanges,
  BudgetRulesDoc,
  BudgetRulesPayload,
  BudgetRecurring,
  BudgetRecurringDoc,
  BudgetRecurringPayload,
  BudgetRecurringRef,
  BudgetTransaction,
  BudgetTransactionInput,
  BudgetTransactionRef,
  BudgetTransactionUpdate,
  CreateBudgetInput,
  ImportTemplate,
  LockedBudget,
  RepeatRule,
  RepeatRuleInput,
  UnlockedBudget,
} from "./types";

// Associated data of every ciphertext: the document path (ADR 0002 — never the owner or members)
const paths = {
  keys: (uid: string) => `budget_keys/${uid}`,
  profile: (uid: string) => `budget_profiles/${uid}`,
  categories: (uid: string) => `budget_categories/${uid}`,
  rules: (uid: string) => `budget_rules/${uid}`,
  account: (accountId: string) => `budget_accounts/${accountId}`,
  month: (accountId: string, month: BudgetMonth) => `budget_months/${accountId}_${month}`,
  plan: (uid: string, month: BudgetMonth) => `budget_plans/${uid}_${month}`,
  recurring: (accountId: string) => `budget_recurring/${accountId}`,
};

const refs = {
  keys: (uid: string) => doc(fb.firestore, paths.keys(uid)).withConverter(firestoreConverter<BudgetKeysDoc>()),
  profile: (uid: string) => doc(fb.firestore, paths.profile(uid)).withConverter(firestoreConverter<BudgetProfileDoc>()),
  categories: (uid: string) =>
    doc(fb.firestore, paths.categories(uid)).withConverter(firestoreConverter<BudgetCategoriesDoc>()),
  rules: (uid: string) => doc(fb.firestore, paths.rules(uid)).withConverter(firestoreConverter<BudgetRulesDoc>()),
  accounts: () => collection(fb.firestore, "budget_accounts").withConverter(firestoreConverter<BudgetAccountDoc>()),
  account: (accountId: string) =>
    doc(fb.firestore, paths.account(accountId)).withConverter(firestoreConverter<BudgetAccountDoc>()),
  months: () => collection(fb.firestore, "budget_months").withConverter(firestoreConverter<BudgetMonthDoc>()),
  month: (accountId: string, month: BudgetMonth) =>
    doc(fb.firestore, paths.month(accountId, month)).withConverter(firestoreConverter<BudgetMonthDoc>()),
  plan: (uid: string, month: BudgetMonth) =>
    doc(fb.firestore, paths.plan(uid, month)).withConverter(firestoreConverter<BudgetPlanDoc>()),
  allRecurring: () =>
    collection(fb.firestore, "budget_recurring").withConverter(firestoreConverter<BudgetRecurringDoc>()),
  recurring: (accountId: string) =>
    doc(fb.firestore, paths.recurring(accountId)).withConverter(firestoreConverter<BudgetRecurringDoc>()),
};

/**
 * Largest encrypted month payload written (a Firestore document holds at most 1 MiB, envelope included).
 * Mirrored by the `budget_months` rules.
 */
export const MAX_MONTH_PAYLOAD_BYTES = 900_000;

const toBytes = (value: Uint8Array) => Bytes.fromUint8Array(value);

// Unwrapped account keys of an unlocked budget, kept for as long as that budget object lives (dropped on lock)
const accountKeyCache = new WeakMap<UnlockedBudget, Map<string, Promise<CryptoKey>>>();

const unwrapAccountKey = ({ uid, userKey }: UnlockedBudget, accountId: string, data: BudgetAccountDoc) => {
  const wrappedKey = data.wrappedKeys[uid];
  if (!wrappedKey) return Promise.reject(new Error("planning:errors.budget.accountKeyMissing"));
  return unwrapDataKey(wrappedKey.toUint8Array(), userKey, paths.account(accountId));
};

const cachedAccountKeys = (budget: UnlockedBudget) => {
  const keys = accountKeyCache.get(budget) ?? new Map<string, Promise<CryptoKey>>();
  accountKeyCache.set(budget, keys);
  return keys;
};

const getAccountKey = (budget: UnlockedBudget, accountId: string, data?: BudgetAccountDoc): Promise<CryptoKey> => {
  const keys = cachedAccountKeys(budget);

  const cached = keys.get(accountId);
  if (cached) return cached;

  const key = (async () => {
    const accountData = data ?? (await getDoc(refs.account(accountId))).data();
    if (!accountData) throw new Error("planning:errors.budget.accountKeyMissing");
    return unwrapAccountKey(budget, accountId, accountData);
  })();
  // A failed unwrap is not cached, so a later call can retry
  key.catch(() => keys.delete(accountId));
  keys.set(accountId, key);
  return key;
};

/** A new account's document: its own data key wrapped by the user key, the name sealed with the account key. */
const sealNewAccount = async (
  { uid, userKey }: UnlockedBudget,
  accountId: string,
  { name, defaultCurrency }: BudgetAccountInput,
  accountKey: CryptoKey,
  now: number,
): Promise<BudgetAccountDoc> => {
  const payload: BudgetAccountPayload = { name };
  return {
    memberIds: [uid],
    defaultCurrency,
    hidden: false,
    wrappedKeys: { [uid]: toBytes(await wrapDataKey(accountKey, userKey, paths.account(accountId))) },
    payload: toBytes(await encryptJson(payload, accountKey, paths.account(accountId))),
    createdAt: now,
  };
};

// ---------------------------------------------------------------------------
// Keys: onboarding and unlock
// ---------------------------------------------------------------------------

/** The user's stored keys, or `null` before onboarding. */
export const getLockedBudget = async (uid: string): Promise<LockedBudget | null> => {
  const snapshot = await getDoc(refs.keys(uid));
  const data = snapshot.data();
  if (!data) return null;

  return {
    uid,
    keyId: data.keyId,
    salt: data.salt.toUint8Array(),
    iterations: data.iterations,
    passphraseWrappedKey: data.passphraseWrappedKey.toUint8Array(),
    recoveryWrappedKey: data.recoveryWrappedKey.toUint8Array(),
  };
};

/**
 * Onboarding: creates the keys, the profile, the category tree and the main account in one transaction.
 * Fails with `errors.budget.alreadySetUp` when the user already has keys (e.g. onboarding finished on another device).
 */
export const createBudget = async (uid: string, input: CreateBudgetInput): Promise<UnlockedBudget> => {
  const recoveryKey = parseRecoveryKey(input.recoveryKey);
  if (!recoveryKey) throw new Error("planning:errors.budget.invalidRecoveryKey");

  // All crypto runs before the transaction, so a retried transaction does not repeat 600,000 PBKDF2 rounds
  const salt = generateSalt();
  const userKey = await generateDataKey();
  const accountKey = await generateDataKey();
  const accountRef = doc(refs.accounts());
  const budget: UnlockedBudget = { uid, keyId: crypto.randomUUID(), userKey };
  const now = Date.now();

  const keysDoc: BudgetKeysDoc = {
    salt: toBytes(salt),
    iterations: KDF_ITERATIONS,
    keyId: budget.keyId,
    passphraseWrappedKey: toBytes(
      await wrapDataKey(userKey, await derivePassphraseKey(input.passphrase, salt), paths.keys(uid)),
    ),
    recoveryWrappedKey: toBytes(await wrapDataKey(userKey, await deriveRecoveryKey(recoveryKey), paths.keys(uid))),
    createdAt: now,
    updatedAt: now,
  };
  const profilePayload: BudgetProfilePayload = { fileAccountMappings: {} };
  const profileDoc: BudgetProfileDoc = {
    mainCurrency: input.mainCurrency,
    mainAccountId: accountRef.id,
    payload: toBytes(await encryptJson(profilePayload, userKey, paths.profile(uid))),
    createdAt: now,
    updatedAt: now,
  };
  const categoriesDoc: BudgetCategoriesDoc = {
    payload: toBytes(await encryptJson(input.categories, userKey, paths.categories(uid))),
    updatedAt: now,
  };
  const accountDoc = await sealNewAccount(
    budget,
    accountRef.id,
    { name: input.mainAccount.name, defaultCurrency: input.mainAccount.currency },
    accountKey,
    now,
  );

  await runTransaction(fb.firestore, async (transaction) => {
    if ((await transaction.get(refs.keys(uid))).exists()) {
      throw new Error("planning:errors.budget.alreadySetUp");
    }
    transaction
      .set(refs.keys(uid), keysDoc)
      .set(refs.profile(uid), profileDoc)
      .set(refs.categories(uid), categoriesDoc)
      .set(accountRef, accountDoc);
  });

  return budget;
};

/** Fails with `errors.budget.wrongPassphrase` when the passphrase does not unwrap the user key. */
export const unlockWithPassphrase = async (locked: LockedBudget, passphrase: string): Promise<UnlockedBudget> => {
  const passphraseKey = await derivePassphraseKey(passphrase, locked.salt, locked.iterations);
  const userKey = await unwrapDataKey(locked.passphraseWrappedKey, passphraseKey, paths.keys(locked.uid)).catch(() => {
    throw new Error("planning:errors.budget.wrongPassphrase");
  });
  return { uid: locked.uid, keyId: locked.keyId, userKey };
};

/**
 * Accepts the key with or without dashes, in any case. Fails with `errors.budget.invalidRecoveryKey` when the input
 * cannot be a recovery key and with `errors.budget.wrongRecoveryKey` when it does not unwrap the user key.
 */
export const unlockWithRecoveryKey = async (locked: LockedBudget, input: string): Promise<UnlockedBudget> => {
  const recoveryKey = parseRecoveryKey(input);
  if (!recoveryKey) throw new Error("planning:errors.budget.invalidRecoveryKey");

  const userKey = await unwrapDataKey(
    locked.recoveryWrappedKey,
    await deriveRecoveryKey(recoveryKey),
    paths.keys(locked.uid),
  ).catch(() => {
    throw new Error("planning:errors.budget.wrongRecoveryKey");
  });
  return { uid: locked.uid, keyId: locked.keyId, userKey };
};

// ---------------------------------------------------------------------------
// Keys: re-wrapping (the data stays encrypted with the same user key)
// ---------------------------------------------------------------------------

type KeysRewrap = Partial<Pick<BudgetKeysDoc, "salt" | "iterations" | "passphraseWrappedKey" | "recoveryWrappedKey">>;

/**
 * Re-wraps in a transaction that fails with `errors.budget.keyChanged` when the stored user key is no longer
 * `budget`'s (the budget was reset on another device): writing it anyway would lock the new budget out.
 */
const rewrapKeys = (budget: UnlockedBudget, fields: KeysRewrap) =>
  runTransaction(fb.firestore, async (transaction) => {
    const stored = (await transaction.get(refs.keys(budget.uid))).data();
    if (stored?.keyId !== budget.keyId) throw new Error("planning:errors.budget.keyChanged");
    transaction.update(refs.keys(budget.uid), { ...fields, updatedAt: Date.now() });
  });

/** Wraps the user key by a new passphrase (new salt). Needs a budget unlocked by a passphrase or recovery key. */
export const changeBudgetPassphrase = async (budget: UnlockedBudget, passphrase: string): Promise<void> => {
  const salt = generateSalt();
  const passphraseKey = await derivePassphraseKey(passphrase, salt);
  await rewrapKeys(budget, {
    salt: toBytes(salt),
    iterations: KDF_ITERATIONS,
    passphraseWrappedKey: toBytes(await wrapDataKey(budget.userKey, passphraseKey, paths.keys(budget.uid))),
  });
};

/** Wraps the user key by a new recovery key; the old one stops working. Needs a budget unlocked by a secret. */
export const replaceRecoveryKey = async (budget: UnlockedBudget, input: string): Promise<void> => {
  const recoveryKey = parseRecoveryKey(input);
  if (!recoveryKey) throw new Error("planning:errors.budget.invalidRecoveryKey");

  const recoveryWrappedKey = await wrapDataKey(budget.userKey, await deriveRecoveryKey(recoveryKey), paths.keys(budget.uid));
  await rewrapKeys(budget, { recoveryWrappedKey: toBytes(recoveryWrappedKey) });
};

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Every budget collection Reset budget empties, and how a user's documents are found in it: `docId` (one document
 * per user, id == uid), `memberIds` (`array-contains uid`) or `ownerId` (`== uid`). A ticket that adds a budget collection adds it here.
 * `budget_keys` is not listed: it is always deleted last.
 */
const RESET_COLLECTIONS: { name: string; owner: "docId" | "memberIds" | "ownerId" }[] = [
  { name: "budget_profiles", owner: "docId" },
  { name: "budget_categories", owner: "docId" },
  { name: "budget_rules", owner: "docId" },
  { name: "budget_months", owner: "memberIds" },
  { name: "budget_accounts", owner: "memberIds" },
  { name: "budget_plans", owner: "ownerId" },
  { name: "budget_recurring", owner: "memberIds" },
];

// Firestore's limit of writes per batch
const BATCH_LIMIT = 500;

/**
 * Deletes every budget document of the user (Reset budget), after which the Budget shows onboarding again.
 * The keys go in the last batch, so a reset that fails half-way leaves the budget locked, not half set up, and can
 * be run again.
 */
export const resetBudget = async (uid: string): Promise<void> => {
  const owned = await Promise.all(
    RESET_COLLECTIONS.map(async ({ name, owner }): Promise<DocumentReference[]> => {
      if (owner === "docId") return [doc(fb.firestore, name, uid)];
      const ownerFilter = owner === "memberIds" ? where("memberIds", "array-contains", uid) : where("ownerId", "==", uid);
      const snapshot = await getDocs(query(collection(fb.firestore, name), ownerFilter));
      return snapshot.docs.map((ownedDoc) => ownedDoc.ref);
    }),
  );
  const toDelete = [...owned.flat(), refs.keys(uid)];

  for (let start = 0; start < toDelete.length; start += BATCH_LIMIT) {
    const batch = writeBatch(fb.firestore);
    toDelete.slice(start, start + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

// ---------------------------------------------------------------------------
// Profile, categories, accounts
// ---------------------------------------------------------------------------

/** The profile's encrypted payload with `changes` applied: every field not changed is kept as stored. */
const profilePayloadBytes = async (
  { uid, userKey }: UnlockedBudget,
  { fileAccountMappings, importTemplates }: BudgetProfile,
  changes: Partial<BudgetProfilePayload>,
) => {
  const profilePayload: BudgetProfilePayload = { fileAccountMappings, importTemplates, ...changes };
  return toBytes(await encryptJson(profilePayload, userKey, paths.profile(uid)));
};

export const getBudgetProfile = async ({ uid, userKey }: UnlockedBudget): Promise<BudgetProfile | null> => {
  const data = (await getDoc(refs.profile(uid))).data();
  if (!data) return null;

  const payload = await decryptJson<BudgetProfilePayload>(data.payload.toUint8Array(), userKey, paths.profile(uid));
  return { mainCurrency: data.mainCurrency, mainAccountId: data.mainAccountId, ...payload };
};

export const getBudgetCategories = async ({ uid, userKey }: UnlockedBudget): Promise<BudgetCategoryTree | null> => {
  const data = (await getDoc(refs.categories(uid))).data();
  if (!data) return null;

  return decryptJson<BudgetCategoryTree>(data.payload.toUint8Array(), userKey, paths.categories(uid));
};

/** The user's accounts, oldest first. */
export const getBudgetAccounts = async (budget: UnlockedBudget): Promise<BudgetAccount[]> => {
  const { uid } = budget;
  const snapshot = await getDocs(query(refs.accounts(), where("memberIds", "array-contains", uid)));

  const accounts = await Promise.all(
    snapshot.docs.map(async (accountDoc) => {
      const data = accountDoc.data();
      const path = paths.account(accountDoc.id);
      const accountKey = await getAccountKey(budget, accountDoc.id, data);
      const { name } = await decryptJson<BudgetAccountPayload>(data.payload.toUint8Array(), accountKey, path);
      return {
        id: accountDoc.id,
        name,
        defaultCurrency: data.defaultCurrency,
        hidden: data.hidden,
        createdAt: data.createdAt,
      };
    }),
  );

  return accounts.sort((a, b) => a.createdAt - b.createdAt);
};

// ---------------------------------------------------------------------------
// Account management (Settings → Accounts & security)
// ---------------------------------------------------------------------------

/** Month documents of one account; a month exists only while it holds a transaction. */
const accountMonthsQuery = (uid: string, accountId: string) =>
  query(refs.months(), where("memberIds", "array-contains", uid), where("accountId", "==", accountId));

const hasTransactions = async (uid: string, accountId: string) =>
  !(await getDocs(query(accountMonthsQuery(uid, accountId), limit(1)))).empty;

/** Which of the given accounts hold at least one transaction (one single-document query per account). */
export const getBudgetAccountsWithTransactions = async (
  { uid }: UnlockedBudget,
  accountIds: string[],
): Promise<string[]> => {
  const used = await Promise.all(accountIds.map((accountId) => hasTransactions(uid, accountId)));
  return accountIds.filter((_, index) => used[index]);
};

/** How many transactions an account holds (decrypts all its months; for the delete confirmation). */
export const countBudgetAccountTransactions = async (budget: UnlockedBudget, accountId: string): Promise<number> => {
  const snapshot = await getDocs(accountMonthsQuery(budget.uid, accountId));
  const accountKey = await getAccountKey(budget, accountId);
  const counts = await Promise.all(
    snapshot.docs.map(async (monthDoc) => {
      const { month, payload } = monthDoc.data();
      const { transactions } = await decryptJson<BudgetMonthPayload>(
        payload.toUint8Array(),
        accountKey,
        paths.month(accountId, month),
      );
      return transactions.length;
    }),
  );
  return counts.reduce((sum, count) => sum + count, 0);
};

export const addBudgetAccount = async (budget: UnlockedBudget, input: BudgetAccountInput): Promise<BudgetAccount> => {
  const accountRef = doc(refs.accounts());
  const accountKey = await generateDataKey();
  const createdAt = Date.now();

  await setDoc(accountRef, await sealNewAccount(budget, accountRef.id, input, accountKey, createdAt));
  cachedAccountKeys(budget).set(accountRef.id, Promise.resolve(accountKey));
  return { id: accountRef.id, ...input, hidden: false, createdAt };
};

/**
 * Renames, re-currencies or hides / shows an account. Fails with `errors.budget.accountHasTransactions` when the
 * currency changes on an account with transactions and with `errors.budget.mainAccountLocked` when hiding the main
 * account.
 */
export const updateBudgetAccount = async (
  budget: UnlockedBudget,
  accountId: string,
  { name, defaultCurrency, hidden }: BudgetAccountChanges,
): Promise<void> => {
  // Queries cannot run inside a transaction: checked just before it
  const currencyLocked = defaultCurrency !== undefined && (await hasTransactions(budget.uid, accountId));
  const payload =
    name === undefined
      ? undefined
      : toBytes(
          await encryptJson<BudgetAccountPayload>(
            { name },
            await getAccountKey(budget, accountId),
            paths.account(accountId),
          ),
        );

  await runTransaction(fb.firestore, async (transaction) => {
    const profile = (await transaction.get(refs.profile(budget.uid))).data();
    const account = (await transaction.get(refs.account(accountId))).data();
    if (!account) throw new Error("planning:errors.budget.accountNotFound");
    if (hidden && profile?.mainAccountId === accountId) throw new Error("planning:errors.budget.mainAccountLocked");
    if (currencyLocked && defaultCurrency !== account.defaultCurrency) {
      throw new Error("planning:errors.budget.accountHasTransactions");
    }

    transaction.update(refs.account(accountId), {
      ...(defaultCurrency !== undefined && { defaultCurrency }),
      ...(hidden !== undefined && { hidden }),
      ...(payload && { payload }),
    });
  });
};

/** Makes the account the main one (preselected for new and imported transactions). A hidden account cannot be main. */
export const setMainBudgetAccount = async ({ uid }: UnlockedBudget, accountId: string): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const account = (await transaction.get(refs.account(accountId))).data();
    if (!account) throw new Error("planning:errors.budget.accountNotFound");
    if (account.hidden) throw new Error("planning:errors.budget.hiddenAccountCannotBeMain");
    transaction.update(refs.profile(uid), { mainAccountId: accountId, updatedAt: Date.now() });
  });
};

/** Changes the main currency; fails with `errors.budget.mainCurrencyLocked` once any transaction exists. */
export const setBudgetMainCurrency = async ({ uid }: UnlockedBudget, mainCurrency: string): Promise<void> => {
  const anyMonth = await getDocs(query(refs.months(), where("memberIds", "array-contains", uid), limit(1)));
  if (!anyMonth.empty) throw new Error("planning:errors.budget.mainCurrencyLocked");
  await updateDoc(refs.profile(uid), { mainCurrency, updatedAt: Date.now() });
};

/**
 * Deletes an account with every document that belongs to it (its months and its recurring transactions) and forgets
 * it in the remembered bank-file mappings. Refunds linked across accounts are unlinked first: the other side, in
 * another account, is restored (its refund split-off removed, or its refund counted again). The main account is never
 * deleted (`errors.budget.mainAccountLocked`). Batches of 500 with the account in the last one, so a cascade that fails
 * half-way leaves the account listed and can be run again.
 */
export const deleteBudgetAccount = async (budget: UnlockedBudget, accountId: string): Promise<void> => {
  const { uid } = budget;
  const profile = await getBudgetProfile(budget);
  if (!profile || profile.mainAccountId === accountId) throw new Error("planning:errors.budget.mainAccountLocked");

  const months = await getDocs(accountMonthsQuery(uid, accountId));
  const accountKey = await getAccountKey(budget, accountId);
  const stored = await Promise.all(
    months.docs.map(async (monthDoc) => {
      const { month, payload } = monthDoc.data();
      const { transactions } = await decryptJson<BudgetMonthPayload>(
        payload.toUint8Array(),
        accountKey,
        paths.month(accountId, month),
      );
      return transactions;
    }),
  );
  const outward = stored.flat().flatMap(linksOf).filter(({ target }) => target.accountId !== accountId);
  if (outward.length > 0) {
    await runTransaction(fb.firestore, async (transaction) => {
      const linked = await readMonths(transaction, budget, outward.map(({ target }) => linkSlot(target)));
      outward.forEach((link) => detach(linked, link));
      await writeMonths(transaction, budget, linked);
    });
  }

  for (let start = 0; start < months.docs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(fb.firestore);
    months.docs.slice(start, start + BATCH_LIMIT).forEach((monthDoc) => batch.delete(monthDoc.ref));
    await batch.commit();
  }

  const fileAccountMappings = Object.fromEntries(
    Object.entries(profile.fileAccountMappings).filter(([, mappedId]) => mappedId !== accountId),
  );
  const batch = writeBatch(fb.firestore).delete(refs.account(accountId));
  // Deleting a missing document is denied by the rules: only an existing recurring document goes
  if ((await getDoc(refs.recurring(accountId))).exists()) batch.delete(refs.recurring(accountId));
  if (Object.keys(fileAccountMappings).length !== Object.keys(profile.fileAccountMappings).length) {
    batch.update(refs.profile(uid), {
      payload: await profilePayloadBytes(budget, profile, { fileAccountMappings }),
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  cachedAccountKeys(budget).delete(accountId);
};

/**
 * Remembers which Flaner account (or `null`: skip) each bank account of an imported file goes to, merged into the
 * mappings already stored in the encrypted profile. Writes nothing when nothing changes.
 */
export const rememberFileAccountMappings = async (
  budget: UnlockedBudget,
  mappings: BudgetProfile["fileAccountMappings"],
): Promise<void> => {
  const profile = await getBudgetProfile(budget);
  if (!profile) return;

  const fileAccountMappings = { ...profile.fileAccountMappings, ...mappings };
  if (Object.entries(mappings).every(([fileAccount, target]) => profile.fileAccountMappings[fileAccount] === target)) {
    return;
  }

  await updateDoc(refs.profile(budget.uid), {
    payload: await profilePayloadBytes(budget, profile, { fileAccountMappings }),
    updatedAt: Date.now(),
  });
};

/**
 * Saves an import template in the encrypted profile: a template of the same name (case-insensitively) is replaced,
 * else it is added. A file with the template's header is then recognized by it.
 */
export const saveImportTemplate = async (budget: UnlockedBudget, template: ImportTemplate): Promise<void> => {
  const profile = await getBudgetProfile(budget);
  if (!profile) return;

  await updateDoc(refs.profile(budget.uid), {
    payload: await profilePayloadBytes(budget, profile, {
      importTemplates: withImportTemplate(profile.importTemplates ?? [], template),
    }),
    updatedAt: Date.now(),
  });
};

// ---------------------------------------------------------------------------
// Categorization rules: one encrypted document per user (`budget_rules/{uid}`)
// ---------------------------------------------------------------------------

const decryptRules = async ({ uid, userKey }: UnlockedBudget, data: BudgetRulesDoc | undefined): Promise<BudgetRule[]> => {
  if (!data) return [];
  const { rules } = await decryptJson<BudgetRulesPayload>(data.payload.toUint8Array(), userKey, paths.rules(uid));
  return rules;
};

/** The user's categorization rules (none before the first category is set). */
export const getBudgetRules = async (budget: UnlockedBudget): Promise<BudgetRule[]> =>
  decryptRules(budget, (await getDoc(refs.rules(budget.uid))).data());

const readRules = async (transaction: Transaction, budget: UnlockedBudget) =>
  decryptRules(budget, (await transaction.get(refs.rules(budget.uid))).data());

const writeRules = async (transaction: Transaction, { uid, userKey }: UnlockedBudget, rules: BudgetRule[]) => {
  const payload: BudgetRulesPayload = { rules };
  const rulesDoc: BudgetRulesDoc = {
    payload: toBytes(await encryptJson(payload, userKey, paths.rules(uid))),
    updatedAt: Date.now(),
  };
  transaction.set(refs.rules(uid), rulesDoc);
};

/** A category the user set or changed on a transaction: it teaches the transaction's counterparty a rule. */
type RuleLesson = { subject: RuleSubject; categoryId: string };

/**
 * Teaches the lessons in order (the latest wins) inside the caller's transaction; the rules were read with its other
 * reads (`rules`). Writes only when a rule changed.
 */
const teachRules = async (transaction: Transaction, budget: UnlockedBudget, rules: BudgetRule[], lessons: RuleLesson[]) => {
  const learned = lessons.reduce((current, { subject, categoryId }) => learnRule(current, subject, categoryId), rules);
  if (learned !== rules) await writeRules(transaction, budget, learned);
};

/** Settings → Rules: applies one change to the stored rules in a transaction. */
const changeRules = (budget: UnlockedBudget, change: (rules: BudgetRule[]) => BudgetRule[]): Promise<BudgetRule[]> =>
  runTransaction(fb.firestore, async (transaction) => {
    const rules = await readRules(transaction, budget);
    const next = change(rules);
    if (next !== rules) await writeRules(transaction, budget, next);
    return next;
  });

/** Changes a rule's category and / or (keyword rules) its key, e.g. a shortened keyword (`shortenedKeyword`). */
export const editBudgetRule = (
  budget: UnlockedBudget,
  ruleId: string,
  changes: BudgetRuleChanges,
): Promise<BudgetRule[]> => changeRules(budget, (rules) => editRule(rules, ruleId, changes));

export const deleteBudgetRule = (budget: UnlockedBudget, ruleId: string): Promise<BudgetRule[]> =>
  changeRules(budget, (rules) => deleteRule(rules, ruleId));

/** A confirmed new transaction with a category teaches a rule (a manual entry; an import row changed in the preview). */
const lessonsFromNew = (inputs: BudgetTransactionInput[]): RuleLesson[] =>
  inputs.flatMap((input) =>
    input.confirmed && input.categoryId ? [{ subject: input, categoryId: input.categoryId }] : [],
  );

// ---------------------------------------------------------------------------
// Transactions: one encrypted month document per account and month
// ---------------------------------------------------------------------------

const readMonth = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  accountId: string,
  month: BudgetMonth,
): Promise<BudgetMonthPayload> => {
  const data = (await transaction.get(refs.month(accountId, month))).data();
  if (!data) return { transactions: [] };

  const accountKey = await getAccountKey(budget, accountId);
  return decryptJson<BudgetMonthPayload>(data.payload.toUint8Array(), accountKey, paths.month(accountId, month));
};

/** Encrypts and writes the month (deletes it once empty); fails with `errors.budget.monthTooLarge` above the size guard. */
const writeMonth = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  accountId: string,
  month: BudgetMonth,
  payload: BudgetMonthPayload,
) => {
  const ref = refs.month(accountId, month);
  if (payload.transactions.length === 0) {
    transaction.delete(ref);
    return;
  }

  const accountKey = await getAccountKey(budget, accountId);
  const sealed = await encryptJson(payload, accountKey, paths.month(accountId, month));
  if (sealed.byteLength > MAX_MONTH_PAYLOAD_BYTES) throw new Error("planning:errors.budget.monthTooLarge");

  const monthDoc: BudgetMonthDoc = { accountId, memberIds: [budget.uid], month, payload: toBytes(sealed) };
  transaction.set(ref, monthDoc);
};

/** Every transaction of the user's accounts dated in the months `from`..`to` (inclusive, `YYYY-MM`). */
export const getBudgetTransactions = async (
  budget: UnlockedBudget,
  { from, to }: { from: BudgetMonth; to: BudgetMonth },
): Promise<BudgetTransaction[]> => {
  const snapshot = await getDocs(
    query(
      refs.months(),
      where("memberIds", "array-contains", budget.uid),
      where("month", ">=", from),
      where("month", "<=", to),
    ),
  );

  const months = await Promise.all(
    snapshot.docs.map(async (monthDoc) => {
      const { accountId, month, payload } = monthDoc.data();
      const accountKey = await getAccountKey(budget, accountId);
      const { transactions } = await decryptJson<BudgetMonthPayload>(
        payload.toUint8Array(),
        accountKey,
        paths.month(accountId, month),
      );
      return transactions.map((transaction): BudgetTransaction => ({ ...transaction, accountId }));
    }),
  );
  return months.flat();
};

/** Every month `from`..`to` (inclusive, `YYYY-MM`). */
const monthsBetween = (from: BudgetMonth, to: BudgetMonth): BudgetMonth[] => {
  const months: BudgetMonth[] = [];
  for (let [year, month] = from.split("-").map(Number); `${year}-${String(month).padStart(2, "0")}` <= to; ) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return months;
};

/** The transactions of one account dated in the months `from`..`to`: only that account's month documents are read. */
export const getAccountTransactions = async (
  budget: UnlockedBudget,
  accountId: string,
  { from, to }: { from: BudgetMonth; to: BudgetMonth },
): Promise<BudgetTransaction[]> => {
  const accountKey = await getAccountKey(budget, accountId);
  const months = await Promise.all(
    monthsBetween(from, to).map(async (month) => {
      const data = (await getDoc(refs.month(accountId, month))).data();
      if (!data) return [];
      const { transactions } = await decryptJson<BudgetMonthPayload>(
        data.payload.toUint8Array(),
        accountKey,
        paths.month(accountId, month),
      );
      return transactions.map((transaction): BudgetTransaction => ({ ...transaction, accountId }));
    }),
  );
  return months.flat();
};

/** Adds a transaction; a confirmed one with a category (manual entry) teaches its counterparty's rule. */
export const addBudgetTransaction = async (
  budget: UnlockedBudget,
  input: BudgetTransactionInput,
): Promise<BudgetTransaction> => {
  const { accountId, ...stored } = input;
  const month = monthOfDate(input.date);
  const id = crypto.randomUUID();

  const lessons = lessonsFromNew([input]);

  await runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, [{ accountId, month }]);
    months.get(slotId({ accountId, month }))?.transactions.push({ id, ...stored });
    const recurring = await syncRecurring(transaction, budget, months, [input]);
    // A Firestore transaction reads everything before its first write
    const rules = lessons.length > 0 ? await readRules(transaction, budget) : [];
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
    await teachRules(transaction, budget, rules, lessons);
  });

  return { id, ...input };
};

/**
 * Adds an import's transactions in one transaction: every affected month is read, then written. An import that
 * would push any month over the size guard fails as a whole with `errors.budget.importTooLarge`. Rows whose category
 * was set or changed in the preview (confirmed) teach rules; guesses left untouched (unconfirmed) do not.
 */
export const importBudgetTransactions = async (
  budget: UnlockedBudget,
  inputs: BudgetTransactionInput[],
): Promise<BudgetTransaction[]> => {
  const added = inputs.map((input): BudgetTransaction => ({ id: crypto.randomUUID(), ...input }));

  const lessons = lessonsFromNew(inputs);

  await runTransaction(fb.firestore, async (transaction) => {
    // A Firestore transaction reads everything before its first write
    const months = await readMonths(transaction, budget, added.map(slotOf));
    for (const { accountId, ...stored } of added) {
      months.get(slotId(slotOf({ accountId, date: stored.date })))?.transactions.push(stored);
    }
    const recurring = await syncRecurring(transaction, budget, months, added);
    const rules = lessons.length > 0 ? await readRules(transaction, budget) : [];
    try {
      await writeMonths(transaction, budget, months);
    } catch (error) {
      if (error instanceof Error && error.message === "planning:errors.budget.monthTooLarge") {
        throw new Error("planning:errors.budget.importTooLarge");
      }
      throw error;
    }
    await writeRecurringLists(transaction, budget, recurring);
    await teachRules(transaction, budget, rules, lessons);
  });

  return added;
};

export const deleteBudgetTransaction = (budget: UnlockedBudget, ref: BudgetTransactionRef): Promise<void> =>
  deleteBudgetTransactions(budget, [ref]);

type MonthSlot = { accountId: string; month: BudgetMonth };

const slotId = ({ accountId, month }: MonthSlot) => `${accountId}_${month}`;

const slotOf = ({ accountId, date }: Pick<BudgetTransaction, "accountId" | "date">): MonthSlot => ({
  accountId,
  month: monthOfDate(date),
});

type LoadedMonth = { slot: MonthSlot; transactions: BudgetMonthPayload["transactions"] };
type LoadedMonths = Map<string, LoadedMonth>;

/** Reads every slot once (a Firestore transaction needs all reads before its first write). */
const readMonths = async (transaction: Transaction, budget: UnlockedBudget, slots: MonthSlot[]): Promise<LoadedMonths> => {
  const unique = new Map(slots.map((slot) => [slotId(slot), slot]));
  const loaded = await Promise.all(
    [...unique.values()].map(async (slot): Promise<LoadedMonth> => {
      const { transactions } = await readMonth(transaction, budget, slot.accountId, slot.month);
      return { slot, transactions };
    }),
  );
  return new Map(loaded.map((month) => [slotId(month.slot), month]));
};

const writeMonths = (transaction: Transaction, budget: UnlockedBudget, months: LoadedMonths) =>
  Promise.all(
    [...months.values()].map(({ slot, transactions }) =>
      writeMonth(transaction, budget, slot.accountId, slot.month, { transactions }),
    ),
  );

const missingTransaction = () => new Error("planning:errors.budget.transactionMissing");
const linkedLocked = () => new Error("planning:errors.budget.linkedLocked");
const splitOffsTooLarge = () => new Error("planning:errors.budget.splitOffsTooLarge");

type StoredTransaction = BudgetMonthPayload["transactions"][number];

const linkSlot = ({ accountId, month }: BudgetLinkRef): MonthSlot => ({ accountId, month });

/** The stored transaction and its position in an already read month. */
const locate = (months: LoadedMonths, slot: MonthSlot, id: string) => {
  const month = months.get(slotId(slot));
  const index = month ? month.transactions.findIndex((stored) => stored.id === id) : -1;
  if (!month || index === -1) return null;
  return { month, index, stored: month.transactions[index] };
};

const locateOrThrow = (months: LoadedMonths, slot: MonthSlot, id: string) => {
  const found = locate(months, slot, id);
  if (!found) throw missingTransaction();
  return found;
};

/** Removes a refund split-off; its amount returns to the split-off it was carved out of, or to the rest. */
const dropRefundSplitOff = (purchase: StoredTransaction, splitOffId: string): StoredTransaction => {
  const splitOffs = purchase.splitOffs ?? [];
  const removed = splitOffs.find((splitOff) => splitOff.id === splitOffId);
  if (!removed) return purchase;
  return {
    ...purchase,
    splitOffs: splitOffs
      .filter((splitOff) => splitOff.id !== splitOffId)
      .map((splitOff) =>
        splitOff.id === removed.parentSplitOffId ? { ...splitOff, amount: splitOff.amount + removed.amount } : splitOff,
      ),
  };
};

/** A refund that counts again: no link, not excluded. */
const releaseRefund = ({ refundOf: _link, ...refund }: StoredTransaction): StoredTransaction => ({
  ...refund,
  excluded: false,
});

/**
 * The other side of each link a transaction (`sourceId`) holds, and what cleaning it up means there: drop the refund
 * split-off from the purchase, or release the refund.
 */
type LinkEnd = { target: BudgetLinkRef; sourceId: string } & (
  | { side: "purchase"; splitOffId: string }
  | { side: "refund" }
);

const linksOf = (stored: StoredTransaction): LinkEnd[] => {
  const ends: LinkEnd[] = [];
  if (stored.refundOf) {
    ends.push({ target: stored.refundOf, sourceId: stored.id, side: "purchase", splitOffId: stored.refundOf.splitOffId });
  }
  for (const splitOff of stored.splitOffs ?? []) {
    if (splitOff.refund) ends.push({ target: splitOff.refund, sourceId: stored.id, side: "refund" });
  }
  return ends;
};

/**
 * Cleans up the far side of a link whose near side goes away. A far side that is missing, or no longer points back
 * at the near side (relinked meanwhile), is left as it is.
 */
const detach = (months: LoadedMonths, link: LinkEnd) => {
  const found = locate(months, linkSlot(link.target), link.target.transactionId);
  if (!found) return;
  if (link.side === "purchase") {
    const pointsBack = found.stored.splitOffs?.some(
      (splitOff) => splitOff.id === link.splitOffId && splitOff.refund?.transactionId === link.sourceId,
    );
    if (pointsBack) found.month.transactions[found.index] = dropRefundSplitOff(found.stored, link.splitOffId);
  } else if (found.stored.refundOf?.transactionId === link.sourceId) {
    found.month.transactions[found.index] = releaseRefund(found.stored);
  }
};

/** Where a linked far side sits, for re-matching recurring occurrences around it (none when it is missing). */
const linkedDays = (months: LoadedMonths, targets: BudgetLinkRef[]) =>
  targets.flatMap((target) => {
    const found = locate(months, linkSlot(target), target.transactionId);
    return found ? [{ accountId: target.accountId, date: found.stored.date }] : [];
  });

/** Reads the slots not read yet into `months` (still before the transaction's first write). */
const readMoreMonths = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  months: LoadedMonths,
  slots: MonthSlot[],
) => {
  const more = await readMonths(
    transaction,
    budget,
    slots.filter((slot) => !months.has(slotId(slot))),
  );
  more.forEach((month, id) => months.set(id, month));
};

/**
 * Deletes the transactions, each from its month, with their split-offs. A linked refund on the other side is cleaned
 * up: a deleted refund removes its refund split-off from the purchase; a deleted purchase makes its refunds count
 * again. Every affected month (other months and accounts included) is written in one transaction.
 */
export const deleteBudgetTransactions = async (budget: UnlockedBudget, refs: BudgetTransactionRef[]): Promise<void> => {
  const ids = new Set(refs.map((ref) => ref.id));

  await runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, refs.map(slotOf));
    const links = refs
      .flatMap((ref) => {
        const found = locate(months, slotOf(ref), ref.id);
        return found ? linksOf(found.stored) : [];
      })
      .filter(({ target }) => !ids.has(target.transactionId));
    await readMoreMonths(transaction, budget, months, links.map(({ target }) => linkSlot(target)));

    for (const month of months.values()) {
      month.transactions = month.transactions.filter((stored) => !ids.has(stored.id));
    }
    // Before re-matching: a released refund counts (and can match) again
    links.forEach((link) => detach(months, link));
    const recurring = await syncRecurring(transaction, budget, months, [
      ...refs,
      ...linkedDays(
        months,
        links.map(({ target }) => target),
      ),
    ]);
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
  });
};

/**
 * Applies the edits; a new `date` or `accountId` moves the transaction to that month / account document. Every
 * affected month document is read and written in one transaction, so a move never leaves a copy or loses the row.
 * The frozen import fields (`importHash`, `sourceFile`, `counterpartyAccount`) always keep their stored values:
 * the stored transaction is spread and only the patch's fields override it. A category set or changed (not cleared,
 * not merely confirmed) teaches the counterparty's rule, in the same transaction. Both sides of a refund link keep
 * their date, account, type and currency, a linked refund keeps its amount and stays excluded
 * (`errors.budget.linkedLocked`), a split transaction keeps its type (`errors.budget.splitTypeLocked`) and an amount
 * above its split-offs (`errors.budget.splitOffsTooLarge`).
 */
export const updateBudgetTransactions = async (
  budget: UnlockedBudget,
  updates: BudgetTransactionUpdate[],
): Promise<BudgetTransaction[]> =>
  runTransaction(fb.firestore, async (transaction) => {
    const targetOf = ({ ref, patch }: BudgetTransactionUpdate) =>
      slotOf({ accountId: patch.accountId ?? ref.accountId, date: patch.date ?? ref.date });
    const months = await readMonths(transaction, budget, [
      ...updates.map(({ ref }) => slotOf(ref)),
      ...updates.map(targetOf),
    ]);
    const teaches = updates.some(({ patch }) => !!patch.categoryId);
    const rules = teaches ? await readRules(transaction, budget) : [];
    const lessons: RuleLesson[] = [];
    const monthAt = (slot: MonthSlot) => {
      const month = months.get(slotId(slot));
      if (!month) throw missingTransaction();
      return month;
    };

    const updated = updates.map((update) => {
      const { ref, patch } = update;
      const source = monthAt(slotOf(ref));
      const index = source.transactions.findIndex((stored) => stored.id === ref.id);
      if (index === -1) throw missingTransaction();

      const stored = source.transactions[index];
      const changes = (key: "amount" | "amountMain" | "currency" | "excluded" | "date" | "type") =>
        patch[key] !== undefined && patch[key] !== stored[key];
      if (stored.refundOf || stored.splitOffs?.some((splitOff) => splitOff.refund)) {
        // Both sides of a link keep their place (the link points at their month), date (a refund never predates its
        // purchase), type and currency (the refund split-off is in the purchase's currency)
        const moved = slotId(targetOf(update)) !== slotId(slotOf(ref));
        if (moved || changes("date") || changes("type") || changes("currency")) throw linkedLocked();
      }
      // Split-off categories belong to the transaction's type's tree
      if (stored.splitOffs?.length && changes("type")) throw new Error("planning:errors.budget.splitTypeLocked");
      if (stored.refundOf) {
        // A linked refund's amount is locked (its split-off on the purchase mirrors it), and it stays excluded
        if (changes("amount") || changes("amountMain") || changes("excluded")) {
          throw linkedLocked();
        }
      }
      if (patch.amount !== undefined && splitRest({ amount: patch.amount, splitOffs: stored.splitOffs }) <= 0) {
        throw splitOffsTooLarge();
      }
      const next: BudgetTransaction = {
        ...stored,
        accountId: ref.accountId,
        ...patch,
        id: stored.id,
        importHash: stored.importHash,
        sourceFile: stored.sourceFile,
        counterpartyAccount: stored.counterpartyAccount,
      };
      const { accountId, ...nextStored } = next;
      if (next.categoryId && next.categoryId !== stored.categoryId) {
        lessons.push({ subject: next, categoryId: next.categoryId });
      }

      const target = monthAt(targetOf(update));
      if (target === source) {
        source.transactions[index] = nextStored;
      } else {
        source.transactions.splice(index, 1);
        target.transactions.push(nextStored);
      }
      return { ...nextStored, accountId };
    });

    // Matches follow a re-dated, moved or re-categorized transaction: its old and new days are re-matched
    const recurring = await syncRecurring(transaction, budget, months, [...updates.map(({ ref }) => ref), ...updated]);
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
    await teachRules(transaction, budget, rules, lessons);
    return updated;
  });

// ---------------------------------------------------------------------------
// Split-offs and refunds (GLOSSARY → Split-off, Linked refund)
// ---------------------------------------------------------------------------

/** Reads the transaction's month, lets `change` replace it, and writes the month back. */
const changeTransaction = (
  budget: UnlockedBudget,
  ref: BudgetTransactionRef,
  change: (stored: StoredTransaction) => StoredTransaction,
) =>
  runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, [slotOf(ref)]);
    const { month, index, stored } = locateOrThrow(months, slotOf(ref), ref.id);
    month.transactions[index] = change(stored);
    await writeMonths(transaction, budget, months);
  });

const splitOffOrThrow = (stored: StoredTransaction, splitOffId: string) => {
  const splitOff = stored.splitOffs?.find((candidate) => candidate.id === splitOffId);
  if (!splitOff) throw new Error("planning:errors.budget.splitOffMissing");
  return splitOff;
};

/** Every split-off above zero and their sum below the total (`errors.budget.splitOffsTooLarge`). */
const checkSplitOffs = (stored: StoredTransaction) => {
  const splitOffs = stored.splitOffs ?? [];
  if (splitOffs.some((splitOff) => splitOff.amount <= 0) || splitRest(stored) <= 0) throw splitOffsTooLarge();
  return stored;
};

/** Splits off part of a transaction (own amount, category and note); the transaction keeps the rest. */
export const addBudgetSplitOff = async (
  budget: UnlockedBudget,
  ref: BudgetTransactionRef,
  input: BudgetSplitOffInput,
): Promise<BudgetSplitOff> => {
  const splitOff: BudgetSplitOff = { id: crypto.randomUUID(), ...input, excluded: false };
  await changeTransaction(budget, ref, (stored) =>
    checkSplitOffs({ ...stored, splitOffs: [...(stored.splitOffs ?? []), splitOff] }),
  );
  return splitOff;
};

/** Edits or excludes / restores a split-off. A refund split-off keeps its amount and stays excluded. */
export const updateBudgetSplitOff = (
  budget: UnlockedBudget,
  ref: BudgetTransactionRef,
  splitOffId: string,
  patch: BudgetSplitOffPatch,
): Promise<void> =>
  changeTransaction(budget, ref, (stored) => {
    const current = splitOffOrThrow(stored, splitOffId);
    const amountChanges = patch.amount !== undefined && patch.amount !== current.amount;
    if (current.refund && (amountChanges || patch.excluded === false)) throw linkedLocked();
    return checkSplitOffs({
      ...stored,
      splitOffs: (stored.splitOffs ?? []).map((splitOff) => (splitOff.id === splitOffId ? { ...splitOff, ...patch } : splitOff)),
    });
  });

/** Removes a split-off: its amount returns to the transaction. A refund split-off is unlinked (the refund counts again). */
export const removeBudgetSplitOff = async (
  budget: UnlockedBudget,
  ref: BudgetTransactionRef,
  splitOffId: string,
): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, [slotOf(ref)]);
    const { month, index, stored } = locateOrThrow(months, slotOf(ref), ref.id);
    const { refund } = splitOffOrThrow(stored, splitOffId);
    if (refund) await readMoreMonths(transaction, budget, months, [linkSlot(refund)]);

    month.transactions[index] = refund
      ? dropRefundSplitOff(stored, splitOffId)
      : { ...stored, splitOffs: (stored.splitOffs ?? []).filter((splitOff) => splitOff.id !== splitOffId) };
    if (refund) detach(months, { target: refund, sourceId: ref.id, side: "refund" });
    const recurring = refund ? await syncRecurring(transaction, budget, months, linkedDays(months, [refund])) : [];
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
  });
};

/**
 * Links an incoming refund to a purchase (or one of its split-offs): the refund's amount (`input.amount`, in the
 * purchase's currency) is split off the purchase as an excluded refund split-off under the same category, and the
 * refund is excluded. Fails with `errors.budget.refundNotAllowed` unless the refund is income, relevant, not linked,
 * dated on or after the purchase, and smaller than what is left of the purchase / split-off. Both months (any months
 * and accounts) are written in one transaction.
 */
export const linkBudgetRefund = async (
  budget: UnlockedBudget,
  { purchase, splitOffId, refund, amount }: BudgetRefundLinkInput,
): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, [slotOf(purchase), slotOf(refund)]);
    const bought = locateOrThrow(months, slotOf(purchase), purchase.id);
    const returned = locateOrThrow(months, slotOf(refund), refund.id);
    const purchaseTx: BudgetTransaction = { ...bought.stored, accountId: purchase.accountId };
    const parent = splitOffId === undefined ? undefined : splitOffOrThrow(bought.stored, splitOffId);

    const allowed =
      purchaseTx.type === "expense" &&
      !purchaseTx.excluded &&
      !parent?.excluded &&
      returned.stored.type === "income" &&
      !returned.stored.excluded &&
      !returned.stored.refundOf &&
      returned.stored.date >= purchaseTx.date &&
      amount > 0 &&
      amount < refundRoom(purchaseTx, splitOffId);
    if (!allowed) throw new Error("planning:errors.budget.refundNotAllowed");

    const refundSplitOff: BudgetSplitOff = {
      id: crypto.randomUUID(),
      amount,
      categoryId: parent ? parent.categoryId : purchaseTx.categoryId,
      note: returned.stored.payee,
      excluded: true,
      refund: linkRefOf(refund),
      ...(parent && { parentSplitOffId: parent.id }),
    };
    bought.month.transactions[bought.index] = {
      ...bought.stored,
      splitOffs: [
        ...(bought.stored.splitOffs ?? []).map((splitOff) =>
          splitOff.id === parent?.id ? { ...splitOff, amount: splitOff.amount - amount } : splitOff,
        ),
        refundSplitOff,
      ],
    };
    returned.month.transactions[returned.index] = {
      ...returned.stored,
      excluded: true,
      refundOf: { ...linkRefOf(purchase), splitOffId: refundSplitOff.id },
    };
    // An excluded refund no longer matches a recurring occurrence
    const recurring = await syncRecurring(transaction, budget, months, [refund]);
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
  });
};

/**
 * Unlinks a refund: its refund split-off leaves the purchase (the amount returns) and the refund counts again.
 * `refund` is where the refund is stored (the row's own place, or a refund split-off's `refund`).
 */
export const unlinkBudgetRefund = async (budget: UnlockedBudget, refund: BudgetLinkRef): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const months = await readMonths(transaction, budget, [linkSlot(refund)]);
    const returned = locate(months, linkSlot(refund), refund.transactionId);
    if (!returned) throw missingTransaction();
    const { refundOf } = returned.stored;
    if (!refundOf) return;
    await readMoreMonths(transaction, budget, months, [linkSlot(refundOf)]);

    returned.month.transactions[returned.index] = releaseRefund(returned.stored);
    detach(months, { target: refundOf, sourceId: refund.transactionId, side: "purchase", splitOffId: refundOf.splitOffId });
    // A released refund counts again and may match a recurring occurrence
    const recurring = await syncRecurring(transaction, budget, months, [
      { accountId: refund.accountId, date: returned.stored.date },
    ]);
    await writeMonths(transaction, budget, months);
    await writeRecurringLists(transaction, budget, recurring);
  });
};

// ---------------------------------------------------------------------------
// Recurring transactions: one encrypted document per account, its matches kept in step with its months
// ---------------------------------------------------------------------------

const decryptRecurring = async (
  budget: UnlockedBudget,
  accountId: string,
  data: BudgetRecurringDoc,
): Promise<BudgetRecurring[]> => {
  const accountKey = await getAccountKey(budget, accountId);
  const { recurring } = await decryptJson<BudgetRecurringPayload>(
    data.payload.toUint8Array(),
    accountKey,
    paths.recurring(accountId),
  );
  return recurring.map((stored) => ({ ...stored, accountId }));
};

const readRecurring = async (transaction: Transaction, budget: UnlockedBudget, accountId: string) => {
  const data = (await transaction.get(refs.recurring(accountId))).data();
  return data ? decryptRecurring(budget, accountId, data) : [];
};

/** Encrypts and writes an account's recurring transactions (deletes the document once the last one is gone). */
const writeRecurring = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  accountId: string,
  list: BudgetRecurring[],
) => {
  const ref = refs.recurring(accountId);
  if (list.length === 0) {
    transaction.delete(ref);
    return;
  }

  const payload: BudgetRecurringPayload = { recurring: list.map(({ accountId: _accountId, ...stored }) => stored) };
  const sealed = await encryptJson(payload, await getAccountKey(budget, accountId), paths.recurring(accountId));
  // Same 1 MiB document limit as a month
  if (sealed.byteLength > MAX_MONTH_PAYLOAD_BYTES) throw new Error("planning:errors.budget.recurringTooLarge");

  const recurringDoc: BudgetRecurringDoc = { accountId, memberIds: [budget.uid], payload: toBytes(sealed) };
  transaction.set(ref, recurringDoc);
};

type RecurringList = { accountId: string; list: BudgetRecurring[] };

const writeRecurringLists = (transaction: Transaction, budget: UnlockedBudget, lists: RecurringList[]) =>
  Promise.all(lists.map(({ accountId, list }) => writeRecurring(transaction, budget, accountId, list)));

/**
 * Re-matches the account's occurrences due in `window` against its transactions dated within 7 days of it: the
 * months this write already holds (with its changes) and the others read here. Reads only.
 */
const rematchAccount = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  months: LoadedMonths,
  accountId: string,
  list: BudgetRecurring[],
  window: { from: string; to: string },
): Promise<BudgetRecurring[]> => {
  const slots = monthsBetween(
    monthOfDate(shiftDay(window.from, -MATCH_WINDOW_DAYS)),
    monthOfDate(shiftDay(window.to, MATCH_WINDOW_DAYS)),
  ).map((month): MonthSlot => ({ accountId, month }));
  const pool = await Promise.all(
    slots.map(async (slot) => {
      const stored =
        months.get(slotId(slot))?.transactions ??
        (await readMonth(transaction, budget, slot.accountId, slot.month)).transactions;
      return stored.map((transactionInMonth): BudgetTransaction => ({ ...transactionInMonth, accountId }));
    }),
  );
  return rematchRecurring(list, pool.flat(), window);
};

/**
 * Keeps the matches in step with a write to month documents: for each account with recurring transactions, the
 * occurrences due within 7 days of a touched day (the old and new day of every added, edited, moved or deleted
 * transaction) are re-matched. Reads only, so it runs before the write's first write; returns the changed lists.
 */
const syncRecurring = async (
  transaction: Transaction,
  budget: UnlockedBudget,
  months: LoadedMonths,
  touched: Pick<BudgetTransaction, "accountId" | "date">[],
): Promise<RecurringList[]> => {
  const daysByAccount = new Map<string, string[]>();
  for (const { accountId, date } of touched) daysByAccount.set(accountId, [...(daysByAccount.get(accountId) ?? []), date]);

  const lists = await Promise.all(
    [...daysByAccount].map(async ([accountId, days]): Promise<RecurringList | null> => {
      const list = await readRecurring(transaction, budget, accountId);
      if (list.length === 0) return null;

      const sorted = [...days].sort();
      const window = {
        from: shiftDay(sorted[0], -MATCH_WINDOW_DAYS),
        to: shiftDay(sorted[sorted.length - 1], MATCH_WINDOW_DAYS),
      };
      const next = await rematchAccount(transaction, budget, months, accountId, list, window);
      return JSON.stringify(next) === JSON.stringify(list) ? null : { accountId, list: next };
    }),
  );
  return lists.filter((list): list is RecurringList => list !== null);
};

/** Every recurring transaction of the user's accounts, oldest first. */
export const getBudgetRecurring = async (budget: UnlockedBudget): Promise<BudgetRecurring[]> => {
  const snapshot = await getDocs(query(refs.allRecurring(), where("memberIds", "array-contains", budget.uid)));
  const lists = await Promise.all(
    snapshot.docs.map((recurringDoc) => {
      const data = recurringDoc.data();
      return decryptRecurring(budget, data.accountId, data);
    }),
  );
  return lists.flat().sort((a, b) => a.createdAt - b.createdAt);
};

/**
 * Make recurring: the transaction becomes the first occurrence of a new recurring transaction (`start` is its date),
 * and the account's later transactions up to the end of next month are matched at once. Fails with
 * `errors.budget.alreadyRecurring` when the transaction already belongs to one, with
 * `errors.budget.recurringNoOccurrence` when the rule ends before its first occurrence and with
 * `errors.budget.recurringFirstTooFar` when the first occurrence is more than 7 days after the transaction (it could
 * never stay matched to it).
 */
export const makeBudgetTransactionRecurring = async (
  budget: UnlockedBudget,
  source: BudgetTransaction,
  { pattern, end }: RepeatRuleInput,
): Promise<BudgetRecurring> => {
  const rule: RepeatRule = { pattern, start: source.date, end: resolveRepeatEnd(pattern, source.date, end) };
  const firstDue = nextOccurrence(rule, source.date);
  if (!firstDue) throw new Error("planning:errors.budget.recurringNoOccurrence");
  if (daysApart(firstDue, source.date) > MATCH_WINDOW_DAYS) throw new Error("planning:errors.budget.recurringFirstTooFar");

  const created: BudgetRecurring = {
    id: crypto.randomUUID(),
    accountId: source.accountId,
    type: source.type,
    payee: source.payee,
    categoryId: source.categoryId,
    amount: source.amount,
    currency: source.currency,
    amountMain: source.amountMain,
    rule,
    occurrences: { [firstDue]: toMatch(source) },
    createdAt: Date.now(),
  };

  return runTransaction(fb.firestore, async (transaction) => {
    const list = await readRecurring(transaction, budget, source.accountId);
    if (recurringTransactionIds(list).has(source.id)) throw new Error("planning:errors.budget.alreadyRecurring");

    const from = shiftDay(firstDue, 1);
    const next = await rematchAccount(transaction, budget, new Map(), source.accountId, [...list, created], {
      from,
      to: endOfNextMonth(from > todayDay() ? from : todayDay()),
    });
    await writeRecurring(transaction, budget, source.accountId, next);
    return next[next.length - 1];
  });
};

/** Reads the account's list, applies `change` to the recurring transaction `ref` and writes the result. */
const changeRecurring = (
  budget: UnlockedBudget,
  { id, accountId }: BudgetRecurringRef,
  change: (recurring: BudgetRecurring, list: BudgetRecurring[], transaction: Transaction) => Promise<BudgetRecurring[]>,
): Promise<void> =>
  runTransaction(fb.firestore, async (transaction) => {
    const list = await readRecurring(transaction, budget, accountId);
    const recurring = list.find((candidate) => candidate.id === id);
    if (!recurring) throw new Error("planning:errors.budget.recurringMissing");
    await writeRecurring(transaction, budget, accountId, await change(recurring, list, transaction));
  });

/**
 * Edit rule: the new rule applies from today (its `start`). Matches due before its next due date stay as history;
 * later matches are dropped and the occurrences up to the end of next month (or the last dropped match) re-matched,
 * so a transaction no longer on the rule can match another recurring transaction.
 */
export const updateBudgetRecurringRule = (
  budget: UnlockedBudget,
  ref: BudgetRecurringRef,
  { pattern, end }: RepeatRuleInput,
): Promise<void> =>
  changeRecurring(budget, ref, async (recurring, list, transaction) => {
    const start = todayDay();
    const rule: RepeatRule = { pattern, start, end: resolveRepeatEnd(pattern, start, end) };
    const firstDue = nextOccurrence(rule, start);
    const history = Object.fromEntries(
      Object.entries(recurring.occurrences).filter(([dueDate]) => firstDue === null || dueDate < firstDue),
    );
    const edited = list.map((candidate) => (candidate.id === ref.id ? { ...recurring, rule, occurrences: history } : candidate));
    if (!firstDue) return edited;
    const lastStored = Object.keys(recurring.occurrences).sort().at(-1) ?? firstDue;
    const to = endOfNextMonth(firstDue) > lastStored ? endOfNextMonth(firstDue) : lastStored;
    return rematchAccount(transaction, budget, new Map(), ref.accountId, edited, { from: firstDue, to });
  });

/** Stop: nothing is due from today on (an earlier end stays); paid occurrences stay. */
export const stopBudgetRecurring = (budget: UnlockedBudget, ref: BudgetRecurringRef): Promise<void> =>
  changeRecurring(budget, ref, async (recurring, list) => {
    const yesterday = shiftDay(todayDay(), -1);
    const { end } = recurring.rule;
    const date = end.type !== "never" && end.date < yesterday ? end.date : yesterday;
    return list.map((candidate) =>
      candidate.id === ref.id ? { ...recurring, rule: { ...recurring.rule, end: { type: "until", date } } } : candidate,
    );
  });

/** Deletes the recurring transaction; its matched transactions stay as they are. */
export const deleteBudgetRecurring = (budget: UnlockedBudget, ref: BudgetRecurringRef): Promise<void> =>
  changeRecurring(budget, ref, async (_recurring, list) => list.filter((candidate) => candidate.id !== ref.id));

// ---------------------------------------------------------------------------
// Plans: one encrypted document per user and planned month
// ---------------------------------------------------------------------------

const decryptPlan = async (budget: UnlockedBudget, data: BudgetPlanDoc): Promise<BudgetPlan> => {
  const payload = await decryptJson<BudgetPlanPayload>(
    data.payload.toUint8Array(),
    budget.userKey,
    paths.plan(budget.uid, data.month),
  );
  return { month: data.month, ...payload };
};

/** The month's plan, or `null` when the month has none yet. */
export const getBudgetPlan = async (budget: UnlockedBudget, month: BudgetMonth): Promise<BudgetPlan | null> => {
  const data = (await getDoc(refs.plan(budget.uid, month))).data();
  return data ? decryptPlan(budget, data) : null;
};

/**
 * Sets or removes one limit (expense category) or planned income (income category) of a month, creating the month's
 * plan on its first amount. Returns the plan as saved.
 */
export const setBudgetPlanAmount = (
  budget: UnlockedBudget,
  { month, type, categoryId, amount }: BudgetPlanAmountInput,
): Promise<BudgetPlan> =>
  runTransaction(fb.firestore, async (transaction) => {
    const ref = refs.plan(budget.uid, month);
    const stored = (await transaction.get(ref)).data();
    const plan = stored ? await decryptPlan(budget, stored) : { month, limits: {}, plannedIncome: {} };

    const field = type === "expense" ? "limits" : "plannedIncome";
    const { [categoryId]: _removed, ...kept } = plan[field];
    const next: BudgetPlan = { ...plan, [field]: amount === null ? kept : { ...kept, [categoryId]: amount } };

    const payload: BudgetPlanPayload = { limits: next.limits, plannedIncome: next.plannedIncome };
    const planDoc: BudgetPlanDoc = {
      ownerId: budget.uid,
      month,
      payload: toBytes(await encryptJson(payload, budget.userKey, paths.plan(budget.uid, month))),
      updatedAt: Date.now(),
    };
    transaction.set(ref, planDoc);
    return next;
  });
