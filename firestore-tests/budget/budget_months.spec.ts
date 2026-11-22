import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, where } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ACCOUNT_ID, ME, MONTH, MONTH_ID, OTHER, budgetAccount, budgetMonth, bytes } from "./fixtures";

const ACCOUNT = `budget_accounts/${ACCOUNT_ID}`;
const MONTH_PATH = `budget_months/${MONTH_ID}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_months", () => {
  it("lets an account member add the month's first transaction in a transaction, then update and delete it", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME) });
    const db = as(ME);

    // Mirrors addBudgetTransaction: read the (missing) month, then set it
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, MONTH_PATH));
        transaction.set(doc(db, MONTH_PATH), budgetMonth(ME));
      }),
    );
    await assertSucceeds(getDoc(doc(db, MONTH_PATH)));
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, MONTH_PATH));
        transaction.set(doc(db, MONTH_PATH), budgetMonth(ME, { payload: bytes(2048) }));
      }),
    );
    await assertSucceeds(deleteDoc(doc(db, MONTH_PATH)));
  });

  it("lists the caller's months in a month range", async () => {
    await seed({
      [ACCOUNT]: budgetAccount(ME),
      [MONTH_PATH]: budgetMonth(ME),
      [`budget_months/${ACCOUNT_ID}_2026-12`]: budgetMonth(ME, { month: "2026-12" }),
      "budget_months/account-2_2026-11": budgetMonth(OTHER, { accountId: "account-2" }),
    });

    const mine = await assertSucceeds(
      getDocs(
        query(
          collection(as(ME), "budget_months"),
          where("memberIds", "array-contains", ME),
          where("month", ">=", MONTH),
          where("month", "<=", MONTH),
        ),
      ),
    );
    expect(mine.docs.map((d) => d.id)).toEqual([MONTH_ID]);
    await assertFails(getDocs(query(collection(as(ME), "budget_months"), where("month", "==", MONTH))));
  });

  it("denies reading a missing month of another user's account", async () => {
    await seed({ [ACCOUNT]: budgetAccount(OTHER) });

    await assertFails(getDoc(doc(as(ME), MONTH_PATH)));
    await assertSucceeds(getDoc(doc(as(OTHER), MONTH_PATH)));
  });

  it("denies non-members and anonymous access", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), [MONTH_PATH]: budgetMonth(ME) });

    await assertFails(getDoc(doc(as(OTHER), MONTH_PATH)));
    await assertFails(getDoc(doc(anonymous(), MONTH_PATH)));
    await assertFails(setDoc(doc(as(OTHER), MONTH_PATH), budgetMonth(OTHER)));
    await assertFails(deleteDoc(doc(as(OTHER), MONTH_PATH)));
  });

  it("denies a month on another user's account, and other or extra members", async () => {
    await seed({ [ACCOUNT]: budgetAccount(OTHER) });
    const db = as(ME);

    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME)));

    await seed({ [ACCOUNT]: budgetAccount(ME) });
    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { memberIds: [OTHER] })));
    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { memberIds: [ME, OTHER] })));
  });

  it("denies a month whose id does not match its account and month", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), "budget_accounts/account-2": budgetAccount(ME) });
    const db = as(ME);

    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { month: "2026-12" })));
    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { accountId: "account-2" })));
    await assertFails(
      setDoc(doc(db, `budget_months/${ACCOUNT_ID}_2026-13`), budgetMonth(ME, { month: "2026-13" })),
    );
  });

  it("denies an invalid envelope and an oversized payload", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME) });
    const db = as(ME);

    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { payee: "Biedronka" })));
    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { payload: "Biedronka 12,50" })));
    await assertFails(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { payload: bytes(900001) })));
    await assertSucceeds(setDoc(doc(db, MONTH_PATH), budgetMonth(ME, { payload: bytes(900000) })));
  });
});
