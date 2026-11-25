import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ACCOUNT_ID, MONTH_ID, ME, OTHER, budgetAccount, budgetMonth, budgetRules, bytes } from "./fixtures";

const RULES = `budget_rules/${ME}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_rules", () => {
  it("lets the owner create, read, update and delete their rules", async () => {
    const db = as(ME);

    await assertSucceeds(setDoc(doc(db, RULES), budgetRules()));
    await assertSucceeds(getDoc(doc(db, RULES)));
    await assertSucceeds(setDoc(doc(db, RULES), budgetRules({ payload: bytes(524288), updatedAt: 2 })));
    await assertSucceeds(deleteDoc(doc(db, RULES)));
  });

  it("learns in the same transaction as the month write", async () => {
    await seed({ [`budget_accounts/${ACCOUNT_ID}`]: budgetAccount(ME) });
    const db = as(ME);

    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, `budget_months/${MONTH_ID}`));
        await transaction.get(doc(db, RULES));
        transaction.set(doc(db, `budget_months/${MONTH_ID}`), budgetMonth(ME)).set(doc(db, RULES), budgetRules());
      }),
    );
  });

  it("denies other users and anonymous access", async () => {
    await seed({ [RULES]: budgetRules() });

    await assertFails(getDoc(doc(as(OTHER), RULES)));
    await assertFails(getDoc(doc(anonymous(), RULES)));
    await assertFails(setDoc(doc(as(OTHER), RULES), budgetRules()));
    await assertFails(deleteDoc(doc(as(OTHER), RULES)));
  });

  it("denies an invalid envelope", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, RULES), budgetRules({ payload: { rules: [] } })));
    await assertFails(setDoc(doc(db, RULES), budgetRules({ ownerId: ME })));
    await assertFails(setDoc(doc(db, RULES), budgetRules({ updatedAt: "now" })));
    await assertFails(setDoc(doc(db, RULES), budgetRules({ payload: bytes(524289) })));
  });
});
