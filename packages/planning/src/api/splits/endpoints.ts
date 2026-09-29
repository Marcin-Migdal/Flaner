import { fb } from "@flaner/shared/firebase";
import type { UserType } from "@flaner/shared/types";
import { firestoreConverter } from "@flaner/shared/utils";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import {
  addToCurrencyTotals,
  applyExpenseToBalances,
  applySettlementToBalances,
  convertAmount,
  convertSplits,
  getOutstandingDebtAmount,
  hasOutstandingBalance,
  isGroupSettled,
  type GroupBalanceState,
} from "../../utils/splitBalances";
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

type SplitGroupNotification = {
  id: string;
  type: "split_group_invitation" | "split_settlement_pending";
  senderUid: string;
  senderUsername: string;
  senderAvatarUrl: string;
  splitGroupId: string;
  splitGroupName: string;
  createdAt: number;
  read: boolean;
};

const BATCH_LIMIT = 450;

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
  notifications: (userId: string) =>
    collection(fb.firestore, `users/${userId}/notifications`).withConverter(
      firestoreConverter<SplitGroupNotification>(),
    ),
};

const buildInvitationNotification = (
  recipientId: string,
  sender: UserType,
  group: Pick<SplitGroup, "id" | "name">,
) => {
  const notificationRef = doc(refs.notifications(recipientId));
  const notification: SplitGroupNotification = {
    id: notificationRef.id,
    type: "split_group_invitation",
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderAvatarUrl: sender.avatarUrl || "",
    splitGroupId: group.id,
    splitGroupName: group.name,
    createdAt: Date.now(),
    read: false,
  };
  return { notificationRef, notification };
};

const buildSettlementNotification = (
  recipientId: string,
  sender: UserType,
  group: Pick<SplitGroup, "id" | "name">,
) => {
  const notificationRef = doc(refs.notifications(recipientId));
  const notification: SplitGroupNotification = {
    id: notificationRef.id,
    type: "split_settlement_pending",
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderAvatarUrl: sender.avatarUrl || "",
    splitGroupId: group.id,
    splitGroupName: group.name,
    createdAt: Date.now(),
    read: false,
  };
  return { notificationRef, notification };
};

const sortByDateDesc = <T extends { date: string; createdAt: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

const sortVisibleGroups = (groups: SplitGroup[]): SplitGroup[] =>
  groups.filter((group) => group.status !== "deleting").sort((a, b) => b.updatedAt - a.updatedAt);

const assertValidExpense = (group: SplitGroup, data: ExpenseInput) => {
  const involvedUsers = [data.paidBy, ...data.splits.map((split) => split.userId)];
  if (!involvedUsers.every((uid) => group.participants.includes(uid))) {
    throw new Error("Expense references users outside of the group");
  }

  const splitsTotal = data.splits.reduce((sum, split) => sum + split.amount, 0);
  if (data.amount <= 0 || splitsTotal !== data.amount) {
    throw new Error("Expense splits do not add up to the total amount");
  }
};

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export const getUserSplitGroups = async (userId: string): Promise<SplitGroup[]> => {
  const snapshot = await getDocs(query(refs.groups(), where("participants", "array-contains", userId)));
  return sortVisibleGroups(snapshot.docs.map((d) => d.data()));
};

export const subscribeToUserSplitGroups = (userId: string, callback: (groups: SplitGroup[]) => void) => {
  if (!userId) return () => {};

  return onSnapshot(
    query(refs.groups(), where("participants", "array-contains", userId)),
    (snapshot) => {
      callback(sortVisibleGroups(snapshot.docs.map((d) => d.data())));
    },
    (error) => {
      console.warn("Realtime listener on user split groups failed:", error);
    },
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
      const { notificationRef, notification } = buildInvitationNotification(uid, user, newGroup);
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

    transaction.update(groupRef, { ...data, updatedAt: Date.now() });
  });
};

const deleteInBatches = async (docRefs: DocumentReference[]) => {
  for (let index = 0; index < docRefs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(fb.firestore);
    docRefs.slice(index, index + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
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
  await deleteInBatches([...expensesSnap.docs.map((d) => d.ref), ...settlementsSnap.docs.map((d) => d.ref)]);
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

    const { notificationRef, notification } = buildInvitationNotification(participantId, user, group);
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

    const group = groupSnap.data();
    if (group.createdBy === participantId) throw new Error("The owner cannot leave the group");
    if (!group.participants.includes(participantId)) return;
    if (hasOutstandingBalance(group, participantId)) throw new Error("Participant has outstanding balances");

    transaction.update(groupRef, {
      participants: group.participants.filter((uid) => uid !== participantId),
      formerParticipants: Array.from(new Set([...group.formerParticipants, participantId])),
      updatedAt: Date.now(),
    });
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

    const expense: Expense = {
      ...data,
      id: expenseRef.id,
      groupId,
      createdBy: userId,
      createdAt: Date.now(),
    };

    transaction.set(expenseRef, expense);
    transaction.update(groupRef, {
      ...applyExpenseToBalances(group, expense, 1),
      totalSpent: addToCurrencyTotals(group.totalSpent, expense.currency, expense.amount),
      expensesCount: group.expensesCount + 1,
      version: (group.version ?? 0) + 1,
      lastUsedCurrency: expense.currency,
      updatedAt: Date.now(),
    });

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
  userId?: string,
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

    const creatorId = previous.createdBy || previous.paidBy;
    if (userId && creatorId && creatorId !== userId) {
      throw new Error("planning:errors.notAuthorizedToEditExpense");
    }

    const updated: Expense = {
      ...data,
      id: previous.id,
      groupId: previous.groupId,
      createdBy: previous.createdBy,
      createdAt: previous.createdAt,
      updatedAt: Date.now(),
    };

    const reverted = applyExpenseToBalances(group, previous, -1);
    const totals = addToCurrencyTotals(
      addToCurrencyTotals(group.totalSpent, previous.currency, -previous.amount),
      updated.currency,
      updated.amount,
    );

    transaction.set(expenseRef, updated);
    transaction.update(groupRef, {
      ...applyExpenseToBalances(reverted, updated, 1),
      totalSpent: totals,
      version: (group.version ?? 0) + 1,
      lastUsedCurrency: updated.currency,
      updatedAt: Date.now(),
    });

    return updated;
  });
};

export const deleteExpense = async (groupId: string, expenseId: string, userId?: string): Promise<void> => {
  const groupRef = refs.group(groupId);
  const expenseRef = refs.expense(groupId, expenseId);

  await runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, expenseSnap] = await Promise.all([transaction.get(groupRef), transaction.get(expenseRef)]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!expenseSnap.exists()) throw new Error("Expense does not exist");

    const group = groupSnap.data();
    const expense = expenseSnap.data();

    const creatorId = expense.createdBy || expense.paidBy;
    if (userId && creatorId && creatorId !== userId) {
      throw new Error("planning:errors.notAuthorizedToDeleteExpense");
    }

    transaction.delete(expenseRef);
    transaction.update(groupRef, {
      ...applyExpenseToBalances(group, expense, -1),
      totalSpent: addToCurrencyTotals(group.totalSpent, expense.currency, -expense.amount),
      expensesCount: group.expensesCount - 1,
      version: (group.version ?? 0) + 1,
      updatedAt: Date.now(),
    });
  });
};

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export const getGroupSettlements = async (groupId: string): Promise<Settlement[]> => {
  const snapshot = await getDocs(refs.settlements(groupId));
  return sortByDateDesc(snapshot.docs.map((d) => d.data()));
};

export const createSettlement = async (
  groupId: string,
  data: CreateSettlementInput,
  user: UserType | string,
): Promise<Settlement> => {
  const groupRef = refs.group(groupId);
  const settlementRef = doc(refs.settlements(groupId));
  const senderUid = typeof user === "string" ? user : user.uid;
  const isPending = data.status === "pending";

  return runTransaction(fb.firestore, async (transaction) => {
    const groupSnap = await transaction.get(groupRef);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");

    const group = groupSnap.data();

    // 1. OCC Version check
    const currentVersion = group.version ?? 0;
    if (data.expectedVersion !== undefined && currentVersion !== data.expectedVersion) {
      throw new Error("planning:errors.settlementVersionConflict");
    }

    if (!group.participants.includes(data.payerId) || !group.participants.includes(data.receiverId)) {
      throw new Error("Settlement references users outside of the group");
    }
    if (data.amount <= 0 || data.payerId === data.receiverId) {
      throw new Error("Invalid settlement");
    }

    // 2. Debt boundary check: amount cannot exceed current outstanding debt
    const maxDebt = getOutstandingDebtAmount(group, data.payerId, data.receiverId, data.currency);
    if (maxDebt <= 0) {
      throw new Error("planning:errors.noOutstandingDebtToSettle");
    }
    if (data.amount > maxDebt) {
      throw new Error("planning:errors.settlementAmountExceedsDebt");
    }

    const { expectedVersion: _expectedVersion, ...settlementData } = data;
    const settlement: Settlement = {
      ...settlementData,
      id: settlementRef.id,
      groupId,
      status: data.status || "confirmed",
      createdBy: senderUid,
      createdAt: Date.now(),
    };

    transaction.set(settlementRef, settlement);

    if (isPending) {
      transaction.update(groupRef, {
        settlementsCount: group.settlementsCount + 1,
        version: currentVersion + 1,
        lastUsedCurrency: settlement.currency,
        updatedAt: Date.now(),
      });

      if (typeof user !== "string") {
        const { notificationRef, notification } = buildSettlementNotification(
          data.receiverId,
          user,
          group,
        );
        transaction.set(notificationRef, notification);
      }
    } else {
      transaction.update(groupRef, {
        ...applySettlementToBalances(group, settlement, 1),
        settlementsCount: group.settlementsCount + 1,
        version: currentVersion + 1,
        lastUsedCurrency: settlement.currency,
        updatedAt: Date.now(),
      });
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
    const settlement = settlementSnap.data();

    if (settlement.receiverId !== userId) {
      throw new Error("planning:errors.notAuthorizedToConfirmSettlement");
    }

    if (settlement.status === "confirmed") {
      return settlement;
    }

    const currentVersion = group.version ?? 0;
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new Error("planning:errors.settlementVersionConflict");
    }

    const maxDebt = getOutstandingDebtAmount(group, settlement.payerId, settlement.receiverId, settlement.currency);
    if (settlement.amount > maxDebt) {
      throw new Error("planning:errors.settlementAmountExceedsDebt");
    }

    const updatedSettlement: Settlement = {
      ...settlement,
      status: "confirmed",
    };

    transaction.set(settlementRef, updatedSettlement);
    transaction.update(groupRef, {
      ...applySettlementToBalances(group, updatedSettlement, 1),
      version: currentVersion + 1,
      updatedAt: Date.now(),
    });

    return updatedSettlement;
  });
};

export const deleteSettlement = async (groupId: string, settlementId: string, userId?: string): Promise<void> => {
  const groupRef = refs.group(groupId);
  const settlementRef = refs.settlement(groupId, settlementId);

  await runTransaction(fb.firestore, async (transaction) => {
    const [groupSnap, settlementSnap] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(settlementRef),
    ]);
    if (!groupSnap.exists()) throw new Error("Split group does not exist");
    if (!settlementSnap.exists()) throw new Error("Settlement does not exist");

    const group = groupSnap.data();
    const settlement = settlementSnap.data();

    if (userId && settlement.payerId !== userId && settlement.receiverId !== userId) {
      throw new Error("planning:errors.notAuthorizedToDeleteSettlement");
    }

    transaction.delete(settlementRef);

    const nextVersion = (group.version ?? 0) + 1;
    const isPending = settlement.status === "pending";
    if (isPending) {
      transaction.update(groupRef, {
        settlementsCount: Math.max(0, group.settlementsCount - 1),
        version: nextVersion,
        updatedAt: Date.now(),
      });
    } else {
      transaction.update(groupRef, {
        ...applySettlementToBalances(group, settlement, -1),
        settlementsCount: Math.max(0, group.settlementsCount - 1),
        version: nextVersion,
        updatedAt: Date.now(),
      });
    }
  });
};

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

const getRateKey = (currency: string, date: string) => `${currency}|${date}`;

type ConvertibleSource = { currency: string; amount: number; date: string };

/** The value an entry had before any conversion, so repeated conversions never compound rounding. */
const getExpenseSource = (expense: Expense) =>
  expense.conversion
    ? {
        currency: expense.conversion.originalCurrency,
        amount: expense.conversion.originalAmount,
        splits: expense.conversion.originalSplits,
      }
    : { currency: expense.currency, amount: expense.amount, splits: expense.splits };

const getSettlementSource = (settlement: Settlement) =>
  settlement.conversion
    ? { currency: settlement.conversion.originalCurrency, amount: settlement.conversion.originalAmount }
    : { currency: settlement.currency, amount: settlement.amount };

const convertExpense = (expense: Expense, targetCurrency: string, rates: Map<string, ExchangeRate>): Expense => {
  const source = getExpenseSource(expense);
  const { conversion: _conversion, ...base } = expense;

  if (source.currency === targetCurrency) {
    return { ...base, currency: targetCurrency, amount: source.amount, splits: source.splits };
  }

  const exchangeRate = rates.get(getRateKey(source.currency, expense.date));
  if (!exchangeRate) throw new Error(`Missing exchange rate for ${source.currency} on ${expense.date}`);

  const amount = convertAmount(source.amount, exchangeRate.rate);
  return {
    ...base,
    currency: targetCurrency,
    amount,
    splits: convertSplits(source.splits, exchangeRate.rate, amount),
    conversion: {
      originalCurrency: source.currency,
      originalAmount: source.amount,
      originalSplits: source.splits,
      rate: exchangeRate.rate,
      rateDate: exchangeRate.date,
      convertedAt: Date.now(),
    },
  };
};

const convertSettlement = (
  settlement: Settlement,
  targetCurrency: string,
  rates: Map<string, ExchangeRate>,
): Settlement => {
  const source = getSettlementSource(settlement);
  const { conversion: _conversion, ...base } = settlement;

  if (source.currency === targetCurrency) {
    return { ...base, currency: targetCurrency, amount: source.amount };
  }

  const exchangeRate = rates.get(getRateKey(source.currency, settlement.date));
  if (!exchangeRate) throw new Error(`Missing exchange rate for ${source.currency} on ${settlement.date}`);

  return {
    ...base,
    currency: targetCurrency,
    amount: convertAmount(source.amount, exchangeRate.rate),
    conversion: {
      originalCurrency: source.currency,
      originalAmount: source.amount,
      rate: exchangeRate.rate,
      rateDate: exchangeRate.date,
      convertedAt: Date.now(),
    },
  };
};

const fetchRates = async (sources: ConvertibleSource[], targetCurrency: string) => {
  const uniqueKeys = Array.from(
    new Map(
      sources
        .filter((source) => source.currency !== targetCurrency)
        .map((source) => [getRateKey(source.currency, source.date), source]),
    ).values(),
  );

  const entries = await Promise.all(
    uniqueKeys.map(async (source): Promise<[string, ExchangeRate]> => [
      getRateKey(source.currency, source.date),
      await getExchangeRate(source.currency, targetCurrency, source.date),
    ]),
  );
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

  const rates = await fetchRates(
    [
      ...expensesToConvert.map((expense) => ({ ...getExpenseSource(expense), date: expense.date })),
      ...settlementsToConvert.map((settlement) => ({ ...getSettlementSource(settlement), date: settlement.date })),
    ],
    targetCurrency,
  );

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

    const group = groupSnap.data();
    let state: GroupBalanceState = { balances: group.balances, pairBalances: group.pairBalances };
    let totals = group.totalSpent;
    let converted = 0;

    expenseSnaps.forEach((snap) => {
      if (!snap.exists()) return;
      const current = snap.data();
      if (current.currency === targetCurrency) return;

      const next = convertExpense(current, targetCurrency, rates);
      state = applyExpenseToBalances(applyExpenseToBalances(state, current, -1), next, 1);
      totals = addToCurrencyTotals(addToCurrencyTotals(totals, current.currency, -current.amount), next.currency, next.amount);
      transaction.set(snap.ref, next);
      converted++;
    });

    settlementSnaps.forEach((snap) => {
      if (!snap.exists()) return;
      const current = snap.data();
      if (current.currency === targetCurrency) return;

      const next = convertSettlement(current, targetCurrency, rates);
      state = applySettlementToBalances(applySettlementToBalances(state, current, -1), next, 1);
      transaction.set(snap.ref, next);
      converted++;
    });

    transaction.update(groupRef, {
      ...state,
      totalSpent: totals,
      version: (group.version ?? 0) + 1,
      lastUsedCurrency: targetCurrency,
      updatedAt: Date.now(),
    });

    return converted;
  });
};
