import type { LockedBudget, UnlockedBudget } from "../../api/budget";
import { nonExtractableCopy } from "../budgetCrypto";

// "Remember this device" (ADR 0002): a non-extractable copy of the user key in IndexedDB, one record per user.
// A record whose `keyId` no longer matches the stored keys (budget reset on another device) is dropped.

const DB_NAME = "flaner-budget";
const STORE = "rememberedKeys";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "uid" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const inStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

/** Remembers the budget on this device. Needs a key unlocked by a secret (an extractable one). */
export const rememberBudget = async ({ uid, keyId, userKey }: UnlockedBudget): Promise<void> => {
  // A record holds the non-extractable copy of the key
  const record: UnlockedBudget = { uid, keyId, userKey: await nonExtractableCopy(userKey) };
  await inStore("readwrite", (store) => store.put(record));
};

/** The remembered budget for these keys, or `null` (none, another `keyId`, or IndexedDB unavailable). */
export const getRememberedBudget = async (locked: LockedBudget): Promise<UnlockedBudget | null> => {
  try {
    const record = await inStore<UnlockedBudget | undefined>("readonly", (store) => store.get(locked.uid));
    if (!record) return null;
    if (record.keyId !== locked.keyId) {
      await forgetBudget(locked.uid);
      return null;
    }
    return record;
  } catch {
    // Private browsing or blocked storage: the budget simply asks for the passphrase
    return null;
  }
};

/** This device forgets the user's budget (Lock budget, Reset budget). */
export const forgetBudget = async (uid: string): Promise<void> => {
  await inStore("readwrite", (store) => store.delete(uid));
};
