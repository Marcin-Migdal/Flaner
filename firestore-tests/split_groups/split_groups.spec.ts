import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { useTestEnv } from "../support/testEnv";

const OWNER = "owner-uid";
const PARTICIPANT = "participant-uid";
const THIRD = "third-uid";
const OUTSIDER = "outsider-uid";
const GROUP_ID = "split-1";
const GROUP = `split_groups/${GROUP_ID}`;

const { as, seed } = useTestEnv();

type Db = ReturnType<typeof as>;

const splitGroup = (overrides: Record<string, unknown> = {}) => ({
  id: GROUP_ID,
  name: "Trip",
  description: "",
  defaultCurrency: "PLN",
  lastUsedCurrency: "PLN",
  simplifyDebts: false,
  createdBy: OWNER,
  participants: [OWNER, PARTICIPANT, THIRD],
  formerParticipants: [],
  balances: {},
  pairBalances: {},
  totalSpent: {},
  expensesCount: 0,
  settlementsCount: 0,
  version: 0,
  status: "active",
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const expense = (id: string, createdBy: string) => ({
  id,
  groupId: GROUP_ID,
  title: "Dinner",
  amount: 1000,
  currency: "PLN",
  category: "food",
  date: "2026-10-01",
  paidBy: createdBy,
  splitType: "equally",
  splits: [
    { userId: OWNER, amount: 500 },
    { userId: PARTICIPANT, amount: 500 },
  ],
  createdBy,
  createdAt: 1,
});

const settlement = (id: string, createdBy: string, status: "pending" | "confirmed") => ({
  id,
  groupId: GROUP_ID,
  payerId: PARTICIPANT,
  receiverId: OWNER,
  amount: 500,
  currency: "PLN",
  date: "2026-10-02",
  note: "",
  status,
  createdBy,
  createdAt: 1,
});

/**
 * Mirrors the endpoints' transactions: writes the entry and updates the group doc
 * (`groupChanges` receives the current group data) in one atomic write.
 */
const writeWithGroup = (
  db: Db,
  entry: (transaction: Parameters<Parameters<typeof runTransaction>[1]>[0]) => void,
  groupChanges: (group: DocumentData) => DocumentData,
) =>
  runTransaction(db, async (transaction) => {
    const groupRef = doc(db, GROUP);
    const snap = await transaction.get(groupRef);
    const group = snap.data() ?? {};
    entry(transaction);
    transaction.update(groupRef, {
      ...groupChanges(group),
      version: (group.version ?? 0) + 1,
      updatedAt: Date.now(),
    });
  });

/** Mirrors the group-only transactions (updateSplitGroup, removeParticipantFromGroup). */
const updateGroupAs = (uid: string, data: DocumentData) => {
  const db = as(uid);
  return runTransaction(db, async (transaction) => {
    const groupRef = doc(db, GROUP);
    await transaction.get(groupRef);
    transaction.update(groupRef, data);
  });
};

describe("split_groups/{groupId}", () => {
  it("accepts createSplitGroup: group + invitation notifications in one batch", async () => {
    const db = as(OWNER);
    const batch = writeBatch(db);
    batch.set(doc(db, GROUP), splitGroup());
    const notifRef = doc(collection(db, `users/${PARTICIPANT}/notifications`));
    batch.set(notifRef, {
      id: notifRef.id,
      type: "split_group_invitation",
      senderUid: OWNER,
      senderUsername: "Owner",
      senderAvatarUrl: "",
      splitGroupId: GROUP_ID,
      splitGroupName: "Trip",
      createdAt: Date.now(),
      read: false,
    });

    await assertSucceeds(batch.commit());
  });

  it("blocks creating a group with non-zero counters or for someone else", async () => {
    await assertFails(setDoc(doc(as(OWNER), GROUP), splitGroup({ expensesCount: 3 })));
    await assertFails(setDoc(doc(as(OUTSIDER), GROUP), splitGroup()));
  });

  it("allows the participant query and hides the group from outsiders", async () => {
    await seed({ [GROUP]: splitGroup() });

    await assertSucceeds(
      getDocs(query(collection(as(PARTICIPANT), "split_groups"), where("participants", "array-contains", PARTICIPANT))),
    );
    await assertFails(getDoc(doc(as(OUTSIDER), GROUP)));
  });

  it("lets only the owner change name, description and currency (updateSplitGroup)", async () => {
    await seed({ [GROUP]: splitGroup() });

    await assertSucceeds(
      updateGroupAs(OWNER, { name: "Trip 2", defaultCurrency: "EUR", updatedAt: Date.now() }),
    );
    await assertFails(
      updateGroupAs(PARTICIPANT, { name: "Mine", updatedAt: Date.now() }),
    );
  });

  it("lets any participant add people (addParticipantToGroup)", async () => {
    await seed({ [GROUP]: splitGroup() });
    const db = as(PARTICIPANT);

    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        transaction.update(doc(db, GROUP), {
          participants: [OWNER, PARTICIPANT, THIRD, OUTSIDER],
          formerParticipants: [],
          updatedAt: Date.now(),
        });
        const notifRef = doc(collection(db, `users/${OUTSIDER}/notifications`));
        transaction.set(notifRef, {
          id: notifRef.id,
          type: "split_group_invitation",
          senderUid: PARTICIPANT,
          senderUsername: "Participant",
          senderAvatarUrl: "",
          splitGroupId: GROUP_ID,
          splitGroupName: "Trip",
          createdAt: Date.now(),
          read: false,
        });
      }),
    );
  });

  it("lets the owner remove a participant and a participant leave (removeParticipantFromGroup)", async () => {
    await seed({ [GROUP]: splitGroup() });
    await assertSucceeds(
      updateGroupAs(OWNER, {
          participants: [OWNER, PARTICIPANT],
          formerParticipants: [THIRD],
          updatedAt: Date.now(),
        }),
    );

    await seed({ [GROUP]: splitGroup() });
    await assertSucceeds(
      updateGroupAs(THIRD, {
          participants: [OWNER, PARTICIPANT],
          formerParticipants: [THIRD],
          updatedAt: Date.now(),
        }),
    );
  });

  it("blocks removing other participants as a non-owner and the owner leaving", async () => {
    await seed({ [GROUP]: splitGroup() });

    await assertFails(
      updateGroupAs(PARTICIPANT, { participants: [OWNER, PARTICIPANT], updatedAt: Date.now() }),
    );
    await assertFails(
      updateGroupAs(OWNER, { participants: [PARTICIPANT, THIRD], updatedAt: Date.now() }),
    );
  });

  it("accepts the delete flow: status deleting, entries in batches, then the group (deleteSplitGroup)", async () => {
    await seed({
      [GROUP]: splitGroup({ expensesCount: 1, settlementsCount: 1 }),
      [`${GROUP}/expenses/e1`]: expense("e1", PARTICIPANT),
      [`${GROUP}/settlements/s1`]: settlement("s1", PARTICIPANT, "confirmed"),
    });
    const db = as(OWNER);

    await assertSucceeds(
      runTransaction(db, async (transaction) => {
        transaction.update(doc(db, GROUP), { status: "deleting", updatedAt: Date.now() });
      }),
    );
    const batch = writeBatch(db);
    batch.delete(doc(db, `${GROUP}/expenses`, "e1"));
    batch.delete(doc(db, `${GROUP}/settlements`, "s1"));
    await assertSucceeds(batch.commit());
    await assertSucceeds(deleteDoc(doc(db, GROUP)));
  });

  it("blocks deleting an active group and deleting by a participant", async () => {
    await seed({ [GROUP]: splitGroup() });
    await assertFails(deleteDoc(doc(as(OWNER), GROUP)));

    await seed({ [GROUP]: splitGroup({ status: "deleting" }) });
    await assertFails(deleteDoc(doc(as(PARTICIPANT), GROUP)));
  });

  it.todo("G1: blocks balance / totals changes that do not match the written entries");
  it.todo("G3: blocks status 'deleting' while balances are not settled");
  it.todo("G4: decide whether simplifyDebts is owner-only");
});

describe("split_groups/{groupId}/expenses/{expenseId}", () => {
  beforeEach(async () => {
    await seed({ [GROUP]: splitGroup() });
  });

  it("accepts createExpense, updateExpense and deleteExpense transactions", async () => {
    const db = as(PARTICIPANT);
    const ref = doc(db, `${GROUP}/expenses`, "e1");

    await assertSucceeds(
      writeWithGroup(
        db,
        (transaction) => transaction.set(ref, expense("e1", PARTICIPANT)),
        (group) => ({ expensesCount: group.expensesCount + 1, totalSpent: { PLN: 1000 }, lastUsedCurrency: "PLN" }),
      ),
    );
    await assertSucceeds(
      writeWithGroup(
        db,
        (transaction) => transaction.set(ref, { ...expense("e1", PARTICIPANT), title: "Lunch", updatedAt: Date.now() }),
        () => ({ totalSpent: { PLN: 1000 } }),
      ),
    );
    await assertSucceeds(
      writeWithGroup(
        db,
        (transaction) => transaction.delete(ref),
        (group) => ({ expensesCount: group.expensesCount - 1, totalSpent: {} }),
      ),
    );
  });

  it("allows listing expenses to participants only", async () => {
    await assertSucceeds(getDocs(collection(as(PARTICIPANT), `${GROUP}/expenses`)));
    await assertFails(getDocs(collection(as(OUTSIDER), `${GROUP}/expenses`)));
  });

  it("blocks entries written without the group update or in someone else's name", async () => {
    const db = as(PARTICIPANT);

    await assertFails(setDoc(doc(db, `${GROUP}/expenses`, "e1"), expense("e1", PARTICIPANT)));
    await assertFails(
      writeWithGroup(
        db,
        (transaction) => transaction.set(doc(db, `${GROUP}/expenses`, "e1"), expense("e1", OWNER)),
        (group) => ({ expensesCount: group.expensesCount + 1 }),
      ),
    );
  });

  it("blocks outsiders", async () => {
    const db = as(OUTSIDER);

    await assertFails(
      writeWithGroup(
        db,
        (transaction) => transaction.set(doc(db, `${GROUP}/expenses`, "e1"), expense("e1", OUTSIDER)),
        (group) => ({ expensesCount: group.expensesCount + 1 }),
      ),
    );
  });

  it.todo("G2: blocks editing or deleting someone else's expense");
});

describe("split_groups/{groupId}/settlements/{settlementId}", () => {
  beforeEach(async () => {
    await seed({ [GROUP]: splitGroup() });
  });

  it("accepts a confirmed settlement (createSettlement)", async () => {
    const db = as(PARTICIPANT);

    await assertSucceeds(
      writeWithGroup(
        db,
        (transaction) =>
          transaction.set(doc(db, `${GROUP}/settlements`, "s1"), settlement("s1", PARTICIPANT, "confirmed")),
        (group) => ({ settlementsCount: group.settlementsCount + 1 }),
      ),
    );
  });

  it("accepts a pending settlement with notification, then the receiver's confirmation", async () => {
    const payerDb = as(PARTICIPANT);
    await assertSucceeds(
      writeWithGroup(
        payerDb,
        (transaction) => {
          transaction.set(doc(payerDb, `${GROUP}/settlements`, "s1"), settlement("s1", PARTICIPANT, "pending"));
          const notifRef = doc(collection(payerDb, `users/${OWNER}/notifications`));
          transaction.set(notifRef, {
            id: notifRef.id,
            type: "split_settlement_pending",
            senderUid: PARTICIPANT,
            senderUsername: "Participant",
            senderAvatarUrl: "",
            splitGroupId: GROUP_ID,
            splitGroupName: "Trip",
            createdAt: Date.now(),
            read: false,
          });
        },
        (group) => ({ settlementsCount: group.settlementsCount + 1 }),
      ),
    );

    const receiverDb = as(OWNER);
    await assertSucceeds(
      writeWithGroup(
        receiverDb,
        (transaction) =>
          transaction.set(doc(receiverDb, `${GROUP}/settlements`, "s1"), settlement("s1", PARTICIPANT, "confirmed")),
        () => ({}),
      ),
    );
  });

  it("accepts deleteSettlement", async () => {
    await seed({
      [GROUP]: splitGroup({ settlementsCount: 1 }),
      [`${GROUP}/settlements/s1`]: settlement("s1", PARTICIPANT, "confirmed"),
    });
    const db = as(OWNER);

    await assertSucceeds(
      writeWithGroup(
        db,
        (transaction) => transaction.delete(doc(db, `${GROUP}/settlements`, "s1")),
        (group) => ({ settlementsCount: group.settlementsCount - 1 }),
      ),
    );
  });

  it("blocks settlements written without the group update", async () => {
    await assertFails(
      setDoc(doc(as(PARTICIPANT), `${GROUP}/settlements`, "s1"), settlement("s1", PARTICIPANT, "confirmed")),
    );
  });

  it.todo("G2: lets only the receiver confirm and only the payer / receiver delete a settlement");
});
