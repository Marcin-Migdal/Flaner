import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, where } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ACCOUNT_ID, ME, OTHER, RECURRING_PATH, budgetAccount, budgetRecurring, bytes } from "./fixtures";

const ACCOUNT = `budget_accounts/${ACCOUNT_ID}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_recurring", () => {
  it("lets an account member make the first recurring transaction in a transaction, then update and delete it", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME) });
    const db = as(ME);

    // Mirrors makeBudgetTransactionRecurring: read the (missing) document, then set it
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, RECURRING_PATH));
        transaction.set(doc(db, RECURRING_PATH), budgetRecurring(ME));
      }),
    );
    await assertSucceeds(getDoc(doc(db, RECURRING_PATH)));
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, RECURRING_PATH));
        transaction.set(doc(db, RECURRING_PATH), budgetRecurring(ME, { payload: bytes(2048) }));
      }),
    );
    // Deleting the last recurring transaction deletes the document
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, RECURRING_PATH));
        transaction.delete(doc(db, RECURRING_PATH));
      }),
    );
  });

  it("lists only the caller's documents (load, reset)", async () => {
    await seed({
      [ACCOUNT]: budgetAccount(ME),
      [RECURRING_PATH]: budgetRecurring(ME),
      "budget_recurring/account-2": budgetRecurring(OTHER, { accountId: "account-2" }),
    });
    const recurring = collection(as(ME), "budget_recurring");

    const mine = await assertSucceeds(getDocs(query(recurring, where("memberIds", "array-contains", ME))));
    expect(mine.docs.map((d) => d.id)).toEqual([ACCOUNT_ID]);
    await assertFails(getDocs(query(recurring, where("accountId", "==", "account-2"))));
  });

  it("allows reading a missing document of an own account only", async () => {
    await seed({ [ACCOUNT]: budgetAccount(OTHER) });

    await assertFails(getDoc(doc(as(ME), RECURRING_PATH)));
    await assertSucceeds(getDoc(doc(as(OTHER), RECURRING_PATH)));
  });

  it("denies non-members and anonymous access", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), [RECURRING_PATH]: budgetRecurring(ME) });

    await assertFails(getDoc(doc(anonymous(), RECURRING_PATH)));
    await assertFails(getDoc(doc(as(OTHER), RECURRING_PATH)));
    await assertFails(setDoc(doc(as(OTHER), RECURRING_PATH), budgetRecurring(OTHER)));
    await assertFails(deleteDoc(doc(as(OTHER), RECURRING_PATH)));
  });

  it("denies other or extra members and a document on another user's account", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), "budget_accounts/account-2": budgetAccount(OTHER) });
    const db = as(ME);

    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { memberIds: [ME, OTHER] })));
    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { memberIds: [OTHER] })));
    await assertFails(setDoc(doc(db, "budget_recurring/account-2"), budgetRecurring(ME, { accountId: "account-2" })));
  });

  it("denies an id mismatch, an invalid envelope and an oversized payload", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), "budget_accounts/account-3": budgetAccount(ME) });
    const db = as(ME);

    await assertFails(setDoc(doc(db, "budget_recurring/account-3"), budgetRecurring(ME)));
    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { payee: "Netflix" })));
    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { payload: "Netflix 45 PLN" })));
    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { accountId: 7 })));
    await assertFails(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { payload: bytes(900001) })));
    await assertSucceeds(setDoc(doc(db, RECURRING_PATH), budgetRecurring(ME, { payload: bytes(900000) })));
  });
});
