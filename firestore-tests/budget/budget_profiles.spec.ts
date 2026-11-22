import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ME, OTHER, budgetProfile } from "./fixtures";

const PROFILE = `budget_profiles/${ME}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_profiles", () => {
  it("lets the owner create, read, update and delete their profile", async () => {
    const db = as(ME);

    await assertSucceeds(setDoc(doc(db, PROFILE), budgetProfile()));
    await assertSucceeds(getDoc(doc(db, PROFILE)));
    await assertSucceeds(setDoc(doc(db, PROFILE), budgetProfile({ mainCurrency: "EUR", updatedAt: 2 })));
    await assertSucceeds(deleteDoc(doc(db, PROFILE)));
  });

  it("denies other users and anonymous access", async () => {
    await seed({ [PROFILE]: budgetProfile() });

    await assertFails(getDoc(doc(as(OTHER), PROFILE)));
    await assertFails(getDoc(doc(anonymous(), PROFILE)));
    await assertFails(setDoc(doc(as(OTHER), PROFILE), budgetProfile()));
    await assertFails(deleteDoc(doc(as(OTHER), PROFILE)));
  });

  it("denies an invalid envelope", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, PROFILE), budgetProfile({ importTemplates: [] })));
    await assertFails(setDoc(doc(db, PROFILE), budgetProfile({ payload: "readable" })));
    await assertFails(setDoc(doc(db, PROFILE), budgetProfile({ mainCurrency: "PLNX" })));
    await assertFails(setDoc(doc(db, PROFILE), budgetProfile({ mainAccountId: "" })));
  });

  it("keeps createdAt immutable", async () => {
    await seed({ [PROFILE]: budgetProfile() });

    await assertFails(setDoc(doc(as(ME), PROFILE), budgetProfile({ createdAt: 9 })));
  });
});
