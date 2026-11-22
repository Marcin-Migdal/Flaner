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
  query,
  runTransaction,
  where,
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
import type {
  BudgetAccount,
  BudgetAccountDoc,
  BudgetAccountPayload,
  BudgetCategoriesDoc,
  BudgetCategoryTree,
  BudgetKeysDoc,
  BudgetMonth,
  BudgetMonthDoc,
  BudgetMonthPayload,
  BudgetProfile,
  BudgetProfileDoc,
  BudgetProfilePayload,
  BudgetTransaction,
  BudgetTransactionInput,
  BudgetTransactionRef,
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

const getAccountKey = (budget: UnlockedBudget, accountId: string, data?: BudgetAccountDoc): Promise<CryptoKey> => {
  const keys = accountKeyCache.get(budget) ?? new Map<string, Promise<CryptoKey>>();
  accountKeyCache.set(budget, keys);

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
  const accountPayload: BudgetAccountPayload = { name: input.mainAccount.name };
  const accountDoc: BudgetAccountDoc = {
    memberIds: [uid],
    defaultCurrency: input.mainAccount.currency,
    hidden: false,
    wrappedKeys: { [uid]: toBytes(await wrapDataKey(accountKey, userKey, paths.account(accountRef.id))) },
    payload: toBytes(await encryptJson(accountPayload, accountKey, paths.account(accountRef.id))),
    createdAt: now,
  };

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

export const deleteBudgetTransaction = async (
  budget: UnlockedBudget,
  { id, accountId, date }: BudgetTransactionRef,
): Promise<void> => {
  const month = monthOfDate(date);

  await runTransaction(fb.firestore, async (transaction) => {
    const payload = await readMonth(transaction, budget, accountId, month);
    await writeMonth(transaction, budget, accountId, month, {
      transactions: payload.transactions.filter((stored) => stored.id !== id),
    });
  });
};
