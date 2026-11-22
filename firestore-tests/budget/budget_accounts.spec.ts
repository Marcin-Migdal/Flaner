import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ACCOUNT_ID, ME, OTHER, budgetAccount, bytes } from "./fixtures";

const ACCOUNT = `budget_accounts/${ACCOUNT_ID}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_accounts", () => {
  it("lets a user create a single-member account and work with it", async () => {
    const db = as(ME);

    await assertSucceeds(setDoc(doc(db, ACCOUNT), budgetAccount(ME)));
    await assertSucceeds(getDoc(doc(db, ACCOUNT)));
    await assertSucceeds(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { hidden: true, payload: bytes(64) })));
    await assertSucceeds(deleteDoc(doc(db, ACCOUNT)));
  });

  it("lists only the caller's accounts by memberIds", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME), "budget_accounts/account-2": budgetAccount(OTHER) });

    const mine = await assertSucceeds(
      getDocs(query(collection(as(ME), "budget_accounts"), where("memberIds", "array-contains", ME))),
    );
    expect(mine.docs.map((d) => d.id)).toEqual([ACCOUNT_ID]);
    await assertFails(getDocs(collection(as(ME), "budget_accounts")));
  });

  it("denies non-members and anonymous access", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME) });

    await assertFails(getDoc(doc(as(OTHER), ACCOUNT)));
    await assertFails(getDoc(doc(anonymous(), ACCOUNT)));
    await assertFails(setDoc(doc(as(OTHER), ACCOUNT), budgetAccount(OTHER)));
    await assertFails(deleteDoc(doc(as(OTHER), ACCOUNT)));
  });

  it("denies other or extra members and foreign wrapped keys", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { memberIds: [OTHER] })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { memberIds: [ME, OTHER] })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { wrappedKeys: { [OTHER]: bytes(60) } })));
    await assertFails(
      setDoc(doc(db, ACCOUNT), budgetAccount(ME, { wrappedKeys: { [ME]: bytes(60), [OTHER]: bytes(60) } })),
    );
  });

  it("denies an invalid envelope", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { name: "mBank" })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { payload: "mBank" })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { hidden: "no" })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { defaultCurrency: "zloty" })));
    await assertFails(setDoc(doc(db, ACCOUNT), budgetAccount(ME, { wrappedKeys: { [ME]: bytes(512) } })));
  });

  it("keeps createdAt immutable", async () => {
    await seed({ [ACCOUNT]: budgetAccount(ME) });

    await assertFails(setDoc(doc(as(ME), ACCOUNT), budgetAccount(ME, { createdAt: 9 })));
  });
});
