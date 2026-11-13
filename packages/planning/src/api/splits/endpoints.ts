// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/split_groups.md (keep their Write flows / Queries in sync).
import { fb } from "@flaner/shared/firebase";
import type { UserType } from "@flaner/shared/types";
import { createNotification, deleteIfUnread, getUnreadNotificationRefs, sourceNotificationRef } from "@flaner/shared/api";
import { BATCH_LIMIT, deleteInBatches, firestoreConverter } from "@flaner/shared/utils";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
  type FirestoreError,
} from "firebase/firestore";
import {
  addExpenseToGroup,
  addSettlementToGroup,
  assertCanConfirmSettlement,
  assertCanDeleteExpense,
  assertCanDeleteSettlement,
  assertCanEditExpense,
  assertExpectedVersion,
  assertValidExpense,
  assertValidSettlement,
  changeGroupSettings,
  confirmSettlementInGroup,
  convertGroupCurrency,
  editExpenseInGroup,
  getNewSettlementStatus,
  getRateKey,
  getRequiredRates,
  hasOutstandingBalance,
  isGroupSettled,
  removeExpenseFromGroup,
  removeSettlementFromGroup,
  type ExchangeRates,
  type RateSource,
} from "../../utils/splitLedger";
import { getExchangeRate } from "../exchangeRates";
import type {
  CreateSettlementInput,
  CreateSplitGroupInput,
  ExchangeRate,
  Expense,
  ExpenseInput,
  Settlement,
  SplitGroup,
  UpdateSplitGroupInput,
} from "./types";

const refs = {
  groups: () => collection(fb.firestore, "split_groups").withConverter(firestoreConverter<SplitGroup>()),
  group: (groupId: string) =>
    doc(fb.firestore, "split_groups", groupId).withConverter(firestoreConverter<SplitGroup>()),
  expenses: (groupId: string) =>
    collection(fb.firestore, `split_groups/${groupId}/expenses`).withConverter(firestoreConverter<Expense>()),
  expense: (groupId: string, expenseId: string) =>
    doc(fb.firestore, `split_groups/${groupId}/expenses`, expenseId).withConverter(firestoreConverter<Expense>()),
  settlements: (groupId: string) =>
    collection(fb.firestore, `split_groups/${groupId}/settlements`).withConverter(firestoreConverter<Settlement>()),
  settlement: (groupId: string, settlementId: string) =>
    doc(fb.firestore, `split_groups/${groupId}/settlements`, settlementId).withConverter(
      firestoreConverter<Settlement>(),
    ),
  // Deterministic ids (see sourceNotificationRef), so resolving flows can remove them while unread
  invitationNotification: (userId: string, groupId: string) =>
    sourceNotificationRef(userId, "split_group_invitation", groupId),
  settlementNotification: (userId: string, settlementId: string) =>
    sourceNotificationRef(userId, "split_settlement_pending", settlementId),
};

const buildInvitationNotification = (recipientId: string, sender: UserType, group: Pick<SplitGroup, "id" | "name">) =>
  createNotification(recipientId, sender, {
    type: "split_group_invitation",
    sourceId: group.id,
    splitGroupId: group.id,
    splitGroupName: group.name,
  });

const buildSettlementNotification = (
  recipientId: string,
  sender: UserType,
  group: Pick<SplitGroup, "id" | "name">,
  settlementId: string,
) =>
  createNotification(recipientId, sender, {
    type: "split_settlement_pending",
    sourceId: settlementId,
    splitGroupId: group.id,
    splitGroupName: group.name,
  });

const sortByDateDesc = <T extends { date: string; createdAt: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

const sortVisibleGroups = (groups: SplitGroup[]): SplitGroup[] =>
  groups.filter((group) => group.status !== "deleting").sort((a, b) => b.updatedAt - a.updatedAt);

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export const getUserSplitGroups = async (userId: string): Promise<SplitGroup[]> => {
  const snapshot = await getDocs(query(refs.groups(), where("participants", "array-contains", userId)));
  return sortVisibleGroups(snapshot.docs.map((d) => d.data()));
};

export const subscribeToUserSplitGroups = (
  userId: string,
  callback: (groups: SplitGroup[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  if (!userId) return () => {};

  return onSnapshot(
    query(refs.groups(), where("participants", "array-contains", userId)),
    (snapshot) => {
      callback(sortVisibleGroups(snapshot.docs.map((d) => d.data())));
    },
    onError,
  );
};

export const createSplitGroup = async (data: CreateSplitGroupInput, user: UserType): Promise<SplitGroup> => {
  const groupRef = doc(refs.groups());
  const participants = Array.from(new Set([user.uid, ...data.participants]));
  const now = Date.now();

  const newGroup: SplitGroup = {
    ...data,
    id: groupRef.id,
    simplifyDebts: data.simplifyDebts ?? false,
    lastUsedCurrency: data.defaultCurrency,
    createdBy: user.uid,
    participants,
    formerParticipants: [],
    balances: {},
    pairBalances: {},
    totalSpent: {},
    expensesCount: 0,
    settlementsCount: 0,
    version: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(fb.firestore);
  batch.set(groupRef, newGroup);

  participants
    .filter((uid) => uid !== user.uid)
    .forEach((uid) => {
      const { ref: notificationRef, data: notification } = buildInvitationNotification(uid, user, newGroup);
      batch.set(notificationRef, notification);
    });

  await batch.commit();
  return newGroup;
};

export const updateSplitGroup = async (groupId: string, data: UpdateSplitGroupInput): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const groupRef = refs.group(groupId);
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    transaction.update(groupRef, changeGroupSettings(groupSnap.data(), data, Date.now()));
  });
};

/**
 * Deletes a fully settled group: marks it as `deleting` (hidden from lists and unlocking subcollection
 * deletion for the owner), removes all expenses and settlements in batches and finally the group itself.
 */
export const deleteSplitGroup = async (groupId: string, userId: string): Promise<void> => {
  const groupRef = refs.group(groupId);

  await runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const group = groupSnap.data();
    if (group.createdBy !== userId) throw new Error("Only the owner can delete the group");
    if (!isGroupSettled(group)) throw new Error("Group has outstanding balances");

    transaction.update(groupRef, { status: "deleting", updatedAt: Date.now() });
  });

  const [expensesSnap, settlementsSnap] = await Promise.all([
    getDocs(refs.expenses(groupId)),
    getDocs(refs.settlements(groupId)),
  ]);
  // Unread invitations of the other participants and unread pending-settlement notifications go too;
  // the owner may remove them while the group (status 'deleting') still exists
  const group = (await getDoc(groupRef)).data();
  const staleNotifications = await getUnreadNotificationRefs([
    ...(group?.participants ?? []).filter((uid) => uid !== userId).map((uid) => refs.invitationNotification(uid, groupId)),
    ...settlementsSnap.docs
      .map((d) => d.data())
      .filter((settlement) => settlement.status === "pending")
      .map((settlement) => refs.settlementNotification(settlement.receiverId, settlement.id)),
  ]);
  await deleteInBatches(fb.firestore, [
    ...expensesSnap.docs.map((d) => d.ref),
    ...settlementsSnap.docs.map((d) => d.ref),
    ...staleNotifications,
  ]);
  await deleteDoc(groupRef);
};

export const addParticipantToGroup = async (groupId: string, participantId: string, user: UserType): Promise<void> => {
  const groupRef = refs.group(groupId);

  await runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const group = groupSnap.data();
    if (group.participants.includes(participantId)) return;

    transaction.update(groupRef, {
      participants: [...group.participants, participantId],
      formerParticipants: group.formerParticipants.filter((uid) => uid !== participantId),
      updatedAt: Date.now(),
    });

    const { ref: notificationRef, data: notification } = buildInvitationNotification(participantId, user, group);
    transaction.set(notificationRef, notification);
  });
};

/**
 * Removes a participant (or lets a user leave). Only allowed when the user is settled up in every currency.
 */
export const removeParticipantFromGroup = async (groupId: string, participantId: string): Promise<void> => {
  const groupRef = refs.group(groupId);

  await runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    const removeInvitation = await deleteIfUnread(transaction, refs.invitationNotification(participantId, groupId));

    const group = groupSnap.data();
    if (group.createdBy === participantId) throw new Error("The owner cannot leave the group");
    if (!group.participants.includes(participantId)) return;
    if (hasOutstandingBalance(group, participantId)) throw new Error("Participant has outstanding balances");

    transaction.update(groupRef, {
      participants: group.participants.filter((uid) => uid !== participantId),
      formerParticipants: Array.from(new Set([...group.formerParticipants, participantId])),
      updatedAt: Date.now(),
    });
    removeInvitation();
  });
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------


export const getGroupExpenses = async (groupId: string): Promise<Expense[]> => {
  const snapshot = await getDocs(refs.expenses(groupId));
  return sortByDateDesc(snapshot.docs.map((d) => d.data()));
};

export const createExpense = async (groupId: string, data: ExpenseInput, userId: string): Promise<Expense> => {
  const groupRef = refs.group(groupId);
  const expenseRef = doc(refs.expenses(groupId));

  return runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const group = groupSnap.data();
    assertValidExpense(group, data);

    const now = Date.now();
    const expense: Expense = { ...data, id: expenseRef.id, groupId, createdBy: userId, createdAt: now };

    transaction.set(expenseRef, expense);
    transaction.update(groupRef, addExpenseToGroup(group, expense, now));
    return expense;
  });
};

/**
 * Replaces an expense: reverts the previous version from the balances and applies the new one.
 * Any previous currency conversion metadata is dropped because the user entered new values.
 */
export const updateExpense = async (
  groupId: string,
  expenseId: string,
  data: ExpenseInput,
  userId: string,
): Promise<Expense> => {
  const groupRef = refs.group(groupId);
  const expenseRef = refs.expense(groupId, expenseId);

  return runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, expenseSnap] = await Promise.all([transaction.get(groupRef), transaction.get(expenseRef)]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!expenseSnap.exists()) throw new Error("Expense does not exist");

    const group = groupSnap.data();
    const previous = expenseSnap.data();
    assertValidExpense(group, data);
    assertCanEditExpense(previous, userId);

    const now = Date.now();
    const updated: Expense = {
      ...data,
      id: previous.id,
      groupId: previous.groupId,
      createdBy: previous.createdBy,
      createdAt: previous.createdAt,
      updatedAt: now,
    };

    transaction.set(expenseRef, updated);
    transaction.update(groupRef, editExpenseInGroup(group, previous, updated, now));
    return updated;
  });
};

export const deleteExpense = async (groupId: string, expenseId: string, userId: string): Promise<void> => {
  const groupRef = refs.group(groupId);
  const expenseRef = refs.expense(groupId, expenseId);

  await runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, expenseSnap] = await Promise.all([transaction.get(groupRef), transaction.get(expenseRef)]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!expenseSnap.exists()) throw new Error("Expense does not exist");

    const expense = expenseSnap.data();
    assertCanDeleteExpense(expense, userId);

    transaction.delete(expenseRef);
    transaction.update(groupRef, removeExpenseFromGroup(groupSnap.data(), expense, Date.now()));
  });
};

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export const getGroupSettlements = async (groupId: string): Promise<Settlement[]> => {
  const snapshot = await getDocs(refs.settlements(groupId));
  return sortByDateDesc(snapshot.docs.map((d) => d.data()));
};

/**
 * Records a settlement: confirmed when the receiver records it, otherwise pending (the receiver is notified
 * and confirms it). Pending settlements count against the debt, so the same debt cannot be settled twice.
 */
export const createSettlement = async (
  groupId: string,
  data: CreateSettlementInput,
  user: UserType | string,
): Promise<Settlement> => {
  const groupRef = refs.group(groupId);
  const settlementRef = doc(refs.settlements(groupId));
  const senderUid = typeof user === "string" ? user : user.uid;

  // A transaction cannot query, so the settlements are read first; every settlement write bumps the group
  // `version`, so an unchanged version inside the transaction proves no settlement slipped in meanwhile.
  const versionBefore = (await getDoc(groupRef)).data()?.version ?? 0;
  const settlements = await getGroupSettlements(groupId);

  return runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const group = groupSnap.data();
    assertExpectedVersion(group, data.expectedVersion);
    assertExpectedVersion(group, versionBefore);
    assertValidSettlement(group, settlements, data);

    const { expectedVersion: _expectedVersion, ...settlementData } = data;
    const now = Date.now();
    const settlement: Settlement = {
      ...settlementData,
      id: settlementRef.id,
      groupId,
      status: getNewSettlementStatus(data, senderUid),
      createdBy: senderUid,
      createdAt: now,
    };

    transaction.set(settlementRef, settlement);
    transaction.update(groupRef, addSettlementToGroup(group, settlement, now));

    if (settlement.status === "pending" && typeof user !== "string") {
      const { ref: notificationRef, data: notification } = buildSettlementNotification(
        data.receiverId,
        user,
        group,
        settlement.id,
      );
      transaction.set(notificationRef, notification);
    }

    return settlement;
  });
};

export const confirmSettlement = async (
  groupId: string,
  settlementId: string,
  userId: string,
  expectedVersion?: number,
): Promise<Settlement> => {
  const groupRef = refs.group(groupId);
  const settlementRef = refs.settlement(groupId, settlementId);

  return runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, settlementSnap] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(settlementRef),
    ]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!settlementSnap.exists()) throw new Error("Settlement does not exist");

    const group = groupSnap.data();
    const current = settlementSnap.data();
    assertCanConfirmSettlement(current, userId);
    if (current.status === "confirmed") return current;

    const removePendingNotification = await deleteIfUnread(
      transaction,
      refs.settlementNotification(current.receiverId, current.id),
    );
    assertExpectedVersion(group, expectedVersion);

    const { settlement, patch } = confirmSettlementInGroup(group, current, Date.now());
    transaction.set(settlementRef, settlement);
    transaction.update(groupRef, patch);
    removePendingNotification();

    return settlement;
  });
};

export const deleteSettlement = async (groupId: string, settlementId: string, userId: string): Promise<void> => {
  const groupRef = refs.group(groupId);
  const settlementRef = refs.settlement(groupId, settlementId);

  await runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, settlementSnap] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(settlementRef),
    ]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!settlementSnap.exists()) throw new Error("Settlement does not exist");

    const settlement = settlementSnap.data();
    assertCanDeleteSettlement(settlement, userId);

    const removePendingNotification =
      settlement.status === "pending"
        ? await deleteIfUnread(transaction, refs.settlementNotification(settlement.receiverId, settlement.id))
        : () => {};

    transaction.delete(settlementRef);
    removePendingNotification();
    transaction.update(groupRef, removeSettlementFromGroup(groupSnap.data(), settlement, Date.now()));
  });
};

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

const CONCURRENCY_LIMIT = 5;

const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

const fetchRates = async (sources: RateSource[], targetCurrency: string): Promise<ExchangeRates> => {
  const entries: [string, ExchangeRate][] = [];
  for (const chunk of chunkArray(sources, CONCURRENCY_LIMIT)) {
    const results = await Promise.all(
      chunk.map(async (source): Promise<[string, ExchangeRate]> => [
        getRateKey(source),
        await getExchangeRate(source.currency, targetCurrency, source.date),
      ]),
    );
    entries.push(...results);
  }

  return new Map(entries);
};

/**
 * Converts every expense and settlement that is not in `targetCurrency`, using the exchange rate
 * from the day of each entry (not the current rate), and moves the balances into `targetCurrency`.
 * Returns the number of converted entries.
 */
export const convertSplitGroupCurrency = async (groupId: string, targetCurrency: string): Promise<number> => {
  const [expenses, settlements] = await Promise.all([getGroupExpenses(groupId), getGroupSettlements(groupId)]);
  const expensesToConvert = expenses.filter((expense) => expense.currency !== targetCurrency);
  const settlementsToConvert = settlements.filter((settlement) => settlement.currency !== targetCurrency);

  const total = expensesToConvert.length + settlementsToConvert.length;
  if (total === 0) return 0;
  if (total > BATCH_LIMIT) throw new Error("Too many entries to convert at once");

  const rates = await fetchRates(getRequiredRates(expensesToConvert, settlementsToConvert, targetCurrency), targetCurrency);
  const groupRef = refs.group(groupId);

  return runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const expenseSnaps = await Promise.all(
      expensesToConvert.map((expense) => transaction.get(refs.expense(groupId, expense.id))),
    );
    const settlementSnaps = await Promise.all(
      settlementsToConvert.map((settlement) => transaction.get(refs.settlement(groupId, settlement.id))),
    );

    // Entries deleted or already converted meanwhile are skipped
    const result = convertGroupCurrency(
      groupSnap.data(),
      {
        expenses: expenseSnaps.flatMap((snap) => (snap.exists() ? [snap.data()] : [])),
        settlements: settlementSnaps.flatMap((snap) => (snap.exists() ? [snap.data()] : [])),
      },
      targetCurrency,
      rates,
      Date.now(),
    );

    result.expenses.forEach((expense) => transaction.set(refs.expense(groupId, expense.id), expense));
    result.settlements.forEach((settlement) => transaction.set(refs.settlement(groupId, settlement.id), settlement));
    transaction.update(groupRef, result.patch);

    return result.expenses.length + result.settlements.length;
  });
};
