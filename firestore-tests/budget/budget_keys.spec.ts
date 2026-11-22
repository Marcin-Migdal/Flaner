import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import {
  ACCOUNT_ID,
  ME,
  OTHER,
  budgetAccount,
  budgetCategories,
  budgetKeys,
  budgetProfile,
  bytes,
} from "./fixtures";

const KEYS = `budget_keys/${ME}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_keys", () => {
  it("allows the onboarding transaction (keys missing → keys, profile, categories, main account)", async () => {
    const db = as(ME);

    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        const keys = await transaction.get(doc(db, KEYS));
        expect(keys.exists()).toBe(false);
        transaction
          .set(doc(db, KEYS), budgetKeys())
          .set(doc(db, `budget_profiles/${ME}`), budgetProfile())
          .set(doc(db, `budget_categories/${ME}`), budgetCategories())
          .set(doc(db, `budget_accounts/${ACCOUNT_ID}`), budgetAccount(ME));
      }),
    );
  });

  it("lets only the owner read the keys", async () => {
    await seed({ [KEYS]: budgetKeys() });

    await assertSucceeds(getDoc(doc(as(ME), KEYS)));
    await assertFails(getDoc(doc(as(OTHER), KEYS)));
    await assertFails(getDoc(doc(anonymous(), KEYS)));
  });

  it("allows re-wrapping the user key, keeping keyId and createdAt", async () => {
    await seed({ [KEYS]: budgetKeys() });

    await assertSucceeds(
      setDoc(doc(as(ME), KEYS), budgetKeys({ salt: bytes(16), passphraseWrappedKey: bytes(60), updatedAt: 2 })),
    );
  });

  it("denies a second onboarding that would replace the user key (new keyId) or changes createdAt", async () => {
    await seed({ [KEYS]: budgetKeys() });

    await assertFails(setDoc(doc(as(ME), KEYS), budgetKeys({ keyId: "key-2" })));
    await assertFails(setDoc(doc(as(ME), KEYS), budgetKeys({ createdAt: 5 })));
  });

  it("denies writing someone else's keys", async () => {
    await assertFails(setDoc(doc(as(OTHER), KEYS), budgetKeys()));
    await assertFails(setDoc(doc(anonymous(), KEYS), budgetKeys()));
  });

  it("denies an invalid envelope", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, KEYS), budgetKeys({ passphrase: "plain text" })));
    await assertFails(setDoc(doc(db, KEYS), budgetKeys({ salt: bytes(8) })));
    await assertFails(setDoc(doc(db, KEYS), budgetKeys({ iterations: 1000 })));
    await assertFails(setDoc(doc(db, KEYS), budgetKeys({ recoveryWrappedKey: bytes(512) })));
    await assertFails(setDoc(doc(db, KEYS), budgetKeys({ passphraseWrappedKey: "not bytes" })));
    const { keyId: _keyId, ...withoutKeyId } = budgetKeys();
    await assertFails(setDoc(doc(db, KEYS), withoutKeyId));
  });

  it("lets only the owner delete the keys", async () => {
    await seed({ [KEYS]: budgetKeys() });

    await assertFails(deleteDoc(doc(as(OTHER), KEYS)));
    await assertSucceeds(deleteDoc(doc(as(ME), KEYS)));
  });
});
