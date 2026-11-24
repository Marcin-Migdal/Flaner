import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";
import { MONTH, ME, OTHER, PLAN_ID, budgetPlan, bytes } from "./fixtures";

const PLAN_PATH = `budget_plans/${PLAN_ID}`;

const { as, anonymous, seed } = useTestEnv();

describe("budget_plans", () => {
  it("lets the owner create a month's plan in a transaction, then read, update and delete it", async () => {
    const db = as(ME);

    // Mirrors setBudgetPlanAmount: read the (missing) plan, then set it
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, PLAN_PATH));
        transaction.set(doc(db, PLAN_PATH), budgetPlan(ME));
      }),
    );
    await assertSucceeds(getDoc(doc(db, PLAN_PATH)));
    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, PLAN_PATH));
        transaction.set(doc(db, PLAN_PATH), budgetPlan(ME, { payload: bytes(1024), updatedAt: 2 }));
      }),
    );
    await assertSucceeds(deleteDoc(doc(db, PLAN_PATH)));
  });

  it("lists only the caller's plans (reset, last planned month)", async () => {
    await seed({
      [PLAN_PATH]: budgetPlan(ME),
      [`budget_plans/${ME}_2026-12`]: budgetPlan(ME, { month: "2026-12" }),
      [`budget_plans/${OTHER}_${MONTH}`]: budgetPlan(OTHER),
    });
    const plans = collection(as(ME), "budget_plans");

    const all = await assertSucceeds(getDocs(query(plans, where("ownerId", "==", ME))));
    expect(all.docs).toHaveLength(2);
    const latest = await assertSucceeds(
      getDocs(query(plans, where("ownerId", "==", ME), orderBy("month", "desc"), limit(1))),
    );
    expect(latest.docs.map((d) => d.id)).toEqual([`${ME}_2026-12`]);
    await assertFails(getDocs(query(plans, where("month", "==", MONTH))));
  });

  it("denies reading another user's plan, missing or existing", async () => {
    const otherPlan = `budget_plans/${OTHER}_${MONTH}`;

    await assertFails(getDoc(doc(as(ME), otherPlan)));
    await assertSucceeds(getDoc(doc(as(OTHER), otherPlan)));

    await seed({ [otherPlan]: budgetPlan(OTHER) });
    await assertFails(getDoc(doc(as(ME), otherPlan)));
  });

  it("denies other users and anonymous access", async () => {
    await seed({ [PLAN_PATH]: budgetPlan(ME) });

    await assertFails(getDoc(doc(anonymous(), PLAN_PATH)));
    await assertFails(getDoc(doc(anonymous(), `budget_plans/${ME}_2026-12`)));
    await assertFails(setDoc(doc(as(OTHER), PLAN_PATH), budgetPlan(OTHER)));
    await assertFails(setDoc(doc(as(OTHER), PLAN_PATH), budgetPlan(ME)));
    await assertFails(deleteDoc(doc(as(OTHER), PLAN_PATH)));
  });

  it("denies a plan owned by someone else or whose id does not match its owner and month", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, `budget_plans/${OTHER}_${MONTH}`), budgetPlan(OTHER)));
    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { ownerId: OTHER })));
    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { month: "2026-12" })));
    await assertFails(setDoc(doc(db, `budget_plans/${ME}_2026-13`), budgetPlan(ME, { month: "2026-13" })));
  });

  it("denies an invalid envelope and an oversized payload", async () => {
    const db = as(ME);

    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { limits: { food: 1500 } })));
    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { payload: "food 1500" })));
    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { updatedAt: "now" })));
    await assertFails(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { payload: bytes(65537) })));
    await assertSucceeds(setDoc(doc(db, PLAN_PATH), budgetPlan(ME, { payload: bytes(65536) })));
  });
});
