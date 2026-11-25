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
import { monthOfDate } from "../../utils/monthLedger";
import { linkRefOf, refundRoom, splitRest } from "../../utils/splitOffs";
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
  BudgetTransaction,
  BudgetTransactionInput,
  BudgetTransactionRef,
  BudgetTransactionUpdate,
  CreateBudgetInput,
  LockedBudget,
  UnlockedBudget,
} from "./types";

// Associated data of every ciphertext: the document path (ADR 0002 — never the owner or members)
const paths = {
  keys: (uid: string) => `budget_keys/${uid}`,
  profile: (uid: string) => `budget_profiles/${uid}`,
  categories: (uid: string) => `budget_categories/${uid}`,
  account: (accountId: string) => `budget_accounts/${accountId}`,
  month: (accountId: string, month: BudgetMonth) => `budget_months/${accountId}_${month}`,
  plan: (uid: string, month: BudgetMonth) => `budget_plans/${uid}_${month}`,
};

const refs = {
  keys: (uid: string) => doc(fb.firestore, paths.keys(uid)).withConverter(firestoreConverter<BudgetKeysDoc>()),
  profile: (uid: string) => doc(fb.firestore, paths.profile(uid)).withConverter(firestoreConverter<BudgetProfileDoc>()),
  categories: (uid: string) =>
    doc(fb.firestore, paths.categories(uid)).withConverter(firestoreConverter<BudgetCategoriesDoc>()),
  accounts: () => collection(fb.firestore, "budget_accounts").withConverter(firestoreConverter<BudgetAccountDoc>()),
  account: (accountId: string) =>
    doc(fb.firestore, paths.account(accountId)).withConverter(firestoreConverter<BudgetAccountDoc>()),
  months: () => collection(fb.firestore, "budget_months").withConverter(firestoreConverter<BudgetMonthDoc>()),
  month: (accountId: string, month: BudgetMonth) =>
    doc(fb.firestore, paths.month(accountId, month)).withConverter(firestoreConverter<BudgetMonthDoc>()),
  plan: (uid: string, month: BudgetMonth) =>
    doc(fb.firestore, paths.plan(uid, month)).withConverter(firestoreConverter<BudgetPlanDoc>()),
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
  { name: "budget_months", owner: "memberIds" },
  { name: "budget_accounts", owner: "memberIds" },
  { name: "budget_plans", owner: "ownerId" },
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
 * Deletes an account with every document that belongs to it (its months; recurring transactions join with their
 * ticket) and forgets it in the remembered bank-file mappings. Refunds linked across accounts are unlinked first: the
 * other side, in another account, is restored (its refund split-off removed, or its refund counted again). The main
 * account is never deleted (`errors.budget.mainAccountLocked`). Batches of 500 with the account in the last one, so
 * a cascade that fails half-way leaves the account listed and can be run again.
 */
export const deleteBudgetAccount = async (budget: UnlockedBudget, accountId: string): Promise<void> => {
  const { uid, userKey } = budget;
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
  const profilePayload: BudgetProfilePayload = { fileAccountMappings };
  const batch = writeBatch(fb.firestore).delete(refs.account(accountId));
  if (Object.keys(fileAccountMappings).length !== Object.keys(profile.fileAccountMappings).length) {
    batch.update(refs.profile(uid), {
      payload: toBytes(await encryptJson(profilePayload, userKey, paths.profile(uid))),
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  cachedAccountKeys(budget).delete(accountId);
};

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

export const addBudgetTransaction = async (
  budget: UnlockedBudget,
  input: BudgetTransactionInput,
): Promise<BudgetTransaction> => {
  const { accountId, ...stored } = input;
  const month = monthOfDate(input.date);
  const id = crypto.randomUUID();

  await runTransaction(fb.firestore, async (transaction) => {
    const payload = await readMonth(transaction, budget, accountId, month);
    await writeMonth(transaction, budget, accountId, month, {
      transactions: [...payload.transactions, { id, ...stored }],
    });
  });

  return { id, ...input };
};

/**
 * Adds an import's transactions in one transaction: every affected month is read, then written. An import that
 * would push any month over the size guard fails as a whole with `errors.budget.importTooLarge`.
 */
export const importBudgetTransactions = async (
  budget: UnlockedBudget,
  inputs: BudgetTransactionInput[],
): Promise<BudgetTransaction[]> => {
  const added = inputs.map((input): BudgetTransaction => ({ id: crypto.randomUUID(), ...input }));
  const byMonth = new Map<string, { accountId: string; month: BudgetMonth; stored: BudgetMonthPayload["transactions"] }>();
  for (const { accountId, ...stored } of added) {
    const month = monthOfDate(stored.date);
    const key = paths.month(accountId, month);
    const group = byMonth.get(key) ?? { accountId, month, stored: [] };
    group.stored.push(stored);
    byMonth.set(key, group);
  }

  await runTransaction(fb.firestore, async (transaction) => {
    // A Firestore transaction reads everything before its first write
    const months = await Promise.all(
      [...byMonth.values()].map(async (group) => ({
        ...group,
        payload: await readMonth(transaction, budget, group.accountId, group.month),
      })),
    );
    for (const { accountId, month, stored, payload } of months) {
      try {
        await writeMonth(transaction, budget, accountId, month, { transactions: [...payload.transactions, ...stored] });
      } catch (error) {
        if (error instanceof Error && error.message === "planning:errors.budget.monthTooLarge") {
          throw new Error("planning:errors.budget.importTooLarge");
        }
        throw error;
      }
    }
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
    links.forEach((link) => detach(months, link));
    await writeMonths(transaction, budget, months);
  });
};

/**
 * Applies the edits; a new `date` or `accountId` moves the transaction to that month / account document. Every
 * affected month document is read and written in one transaction, so a move never leaves a copy or loses the row.
 * The frozen import fields (`importHash`, `sourceFile`, `counterpartyAccount`) always keep their stored values:
 * the stored transaction is spread and only the patch's fields override it. Both sides of a refund link keep their
 * date, account, type and currency, a linked refund keeps its amount and stays excluded (`errors.budget.linkedLocked`),
 * a split transaction keeps its type (`errors.budget.splitTypeLocked`) and an amount above its split-offs
 * (`errors.budget.splitOffsTooLarge`).
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

      const target = monthAt(targetOf(update));
      if (target === source) {
        source.transactions[index] = nextStored;
      } else {
        source.transactions.splice(index, 1);
        target.transactions.push(nextStored);
      }
      return { ...nextStored, accountId };
    });

    await writeMonths(transaction, budget, months);
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
    await writeMonths(transaction, budget, months);
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
    await writeMonths(transaction, budget, months);
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
    await writeMonths(transaction, budget, months);
  });
};

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
