import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { ME, OTHER, budgetCategories, bytes } from "./fixtures";

const CATEGORIES = `budget_categories/${ME}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_categories", () => {
  it("lets the owner create, read, update and delete their tree", async () => {
    const db = as(ME);

    await assertSucceeds(setDoc(doc(db, CATEGORIES), budgetCategories()));
    await assertSucceeds(getDoc(doc(db, CATEGORIES)));
    await assertSucceeds(setDoc(doc(db, CATEGORIES), budgetCategories({ payload: bytes(4096), updatedAt: 2 })));
    await assertSucceeds(deleteDoc(doc(db, CATEGORIES)));
  });

  it("denies other users and anonymous access", async () => {
    await seed({ [CATEGORIES]: budgetCategories() });

    await assertFails(getDoc(doc(as(OTHER), CATEGORIES)));
    await assertFails(getDoc(doc(anonymous(), CATEGORIES)));
    await assertFails(setDoc(doc(as(OTHER), CATEGORIES), budgetCategories()));
    await assertFails(deleteDoc(doc(as(OTHER), CATEGORIES)));
  });

  it("denies an invalid envelope", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, CATEGORIES), budgetCategories({ payload: { expense: [], income: [] } })));
    await assertFails(setDoc(doc(db, CATEGORIES), budgetCategories({ ownerId: ME })));
    await assertFails(setDoc(doc(db, CATEGORIES), budgetCategories({ payload: bytes(262145) })));
  });
});
