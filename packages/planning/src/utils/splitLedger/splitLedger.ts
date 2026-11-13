import type {
  ExchangeRate,
  Expense,
  ExpenseInput,
  Settlement,
  SettlementStatus,
  SplitGroup,
  UpdateSplitGroupInput,
} from "../../api/splits/types";
import type { Debt } from "../debtSimplification";
import {
  addToCurrencyTotals,
  applyExpenseToBalances,
  applySettlementToBalances,
  convertAmount,
  convertSplits,
  getOutstandingDebtAmount,
  getPairwiseDebts,
  getSimplifiedDebts,
  summarizeUserDebts,
  type GroupBalanceState,
  type UserDebtSummary,
} from "../splitBalances";

/**
 * The split-group ledger: every money rule of a split group. Write operations take the current group
 * (and the entry) and return the changes for the group doc; the endpoints only read and write Firestore.
 */

export { getUserBalances, hasOutstandingBalance, isGroupSettled, type UserDebtSummary } from "../splitBalances";

export type GroupLedgerPatch = Partial<
  Pick<
    SplitGroup,
    | "balances"
    | "pairBalances"
    | "totalSpent"
    | "expensesCount"
    | "settlementsCount"
    | "version"
    | "lastUsedCurrency"
    | "updatedAt"
    | "name"
    | "description"
    | "defaultCurrency"
    | "simplifyDebts"
  >
>;

type SettlementPair = Pick<Settlement, "payerId" | "receiverId" | "currency">;

export type SettlementDraft = SettlementPair & Pick<Settlement, "amount">;

// Every change of balances or of the debt mode bumps `version`, so stale views notice it (optimistic concurrency)
const touch = (group: Pick<SplitGroup, "version">, now: number) => ({
  version: (group.version ?? 0) + 1,
  updatedAt: now,
});

const balancesOf = (state: GroupBalanceState) => ({ balances: state.balances, pairBalances: state.pairBalances });

const isPending = (settlement: Pick<Settlement, "status">) => settlement.status === "pending";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Debts in the group's active mode: simplified (net balances) or pairwise. */
export const getActiveDebts = (group: GroupBalanceState): Debt[] =>
  group.simplifyDebts ? getSimplifiedDebts(group.balances) : getPairwiseDebts(group.pairBalances);

export const getDebtSummary = (group: GroupBalanceState, userId: string): UserDebtSummary =>
  summarizeUserDebts(getActiveDebts(group), userId);

/** Sum of the pending settlements from `payerId` to `receiverId` in `currency` (not yet in the balances). */
export const getPendingAmount = (settlements: Settlement[], pair: SettlementPair): number =>
  settlements
    .filter(
      (settlement) =>
        isPending(settlement) &&
        settlement.payerId === pair.payerId &&
        settlement.receiverId === pair.receiverId &&
        settlement.currency === pair.currency,
    )
    .reduce((sum, settlement) => sum + settlement.amount, 0);

/** The most `payerId` can still settle with `receiverId`: the outstanding debt minus what is already pending. */
export const getMaxSettleAmount = (group: GroupBalanceState, settlements: Settlement[], pair: SettlementPair): number =>
  Math.max(
    0,
    getOutstandingDebtAmount(group, pair.payerId, pair.receiverId, pair.currency) - getPendingAmount(settlements, pair),
  );

/** A settlement is confirmed right away only when the receiver records it; otherwise the receiver confirms it. */
export const getNewSettlementStatus = (
  settlement: Pick<Settlement, "receiverId">,
  creatorId: string,
): SettlementStatus => (settlement.receiverId === creatorId ? "confirmed" : "pending");

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export const assertExpectedVersion = (group: Pick<SplitGroup, "version">, expectedVersion?: number) => {
  if (expectedVersion !== undefined && (group.version ?? 0) !== expectedVersion) {
    throw new Error("planning:errors.settlementVersionConflict");
  }
};

export const assertValidExpense = (group: Pick<SplitGroup, "participants">, data: ExpenseInput) => {
  const involvedUsers = [data.paidBy, ...data.splits.map((split) => split.userId)];
  if (!involvedUsers.every((uid) => group.participants.includes(uid))) {
    throw new Error("Expense references users outside of the group");
  }

  const splitsTotal = data.splits.reduce((sum, split) => sum + split.amount, 0);
  if (data.amount <= 0 || splitsTotal !== data.amount) {
    throw new Error("Expense splits do not add up to the total amount");
  }
};

const isExpenseAuthor = (expense: Expense, userId: string) => (expense.createdBy || expense.paidBy) === userId;

export const assertCanEditExpense = (expense: Expense, userId: string) => {
  if (!isExpenseAuthor(expense, userId)) throw new Error("planning:errors.notAuthorizedToEditExpense");
};

export const assertCanDeleteExpense = (expense: Expense, userId: string) => {
  if (!isExpenseAuthor(expense, userId)) throw new Error("planning:errors.notAuthorizedToDeleteExpense");
};

export type SettlementAmountError =
  | "planning:errors.noOutstandingDebtToSettle"
  | "planning:errors.settlementAlreadyPending"
  | "planning:errors.settlementAmountExceedsDebt";

/** Checks the amount against the debt; `settlements` are the group's current ones, so pending ones count. */
export const getSettlementAmountError = (
  group: GroupBalanceState,
  settlements: Settlement[],
  data: SettlementDraft,
): SettlementAmountError | null => {
  if (getOutstandingDebtAmount(group, data.payerId, data.receiverId, data.currency) <= 0) {
    return "planning:errors.noOutstandingDebtToSettle";
  }
  const maxAmount = getMaxSettleAmount(group, settlements, data);
  if (maxAmount <= 0) return "planning:errors.settlementAlreadyPending";
  if (data.amount > maxAmount) return "planning:errors.settlementAmountExceedsDebt";
  return null;
};

export const assertValidSettlement = (
  group: GroupBalanceState & Pick<SplitGroup, "participants">,
  settlements: Settlement[],
  data: SettlementDraft,
) => {
  if (!group.participants.includes(data.payerId) || !group.participants.includes(data.receiverId)) {
    throw new Error("Settlement references users outside of the group");
  }
  if (data.amount <= 0 || data.payerId === data.receiverId) {
    throw new Error("Invalid settlement");
  }
  const amountError = getSettlementAmountError(group, settlements, data);
  if (amountError) throw new Error(amountError);
};

export const assertCanConfirmSettlement = (settlement: Settlement, userId: string) => {
  if (settlement.receiverId !== userId) throw new Error("planning:errors.notAuthorizedToConfirmSettlement");
};

export const assertCanDeleteSettlement = (settlement: Settlement, userId: string) => {
  if (settlement.payerId !== userId && settlement.receiverId !== userId) {
    throw new Error("planning:errors.notAuthorizedToDeleteSettlement");
  }
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const changeGroupSettings = (
  group: SplitGroup,
  data: UpdateSplitGroupInput,
  now: number,
): GroupLedgerPatch => {
  const debtModeChanged = data.simplifyDebts !== undefined && data.simplifyDebts !== (group.simplifyDebts ?? false);
  return debtModeChanged ? { ...data, ...touch(group, now) } : { ...data, updatedAt: now };
};

export const addExpenseToGroup = (group: SplitGroup, expense: Expense, now: number): GroupLedgerPatch => ({
  ...balancesOf(applyExpenseToBalances(group, expense, 1)),
  totalSpent: addToCurrencyTotals(group.totalSpent, expense.currency, expense.amount),
  expensesCount: group.expensesCount + 1,
  lastUsedCurrency: expense.currency,
  ...touch(group, now),
});

export const editExpenseInGroup = (
  group: SplitGroup,
  previous: Expense,
  updated: Expense,
  now: number,
): GroupLedgerPatch => ({
  ...balancesOf(applyExpenseToBalances(applyExpenseToBalances(group, previous, -1), updated, 1)),
  totalSpent: addToCurrencyTotals(
    addToCurrencyTotals(group.totalSpent, previous.currency, -previous.amount),
    updated.currency,
    updated.amount,
  ),
  lastUsedCurrency: updated.currency,
  ...touch(group, now),
});

export const removeExpenseFromGroup = (group: SplitGroup, expense: Expense, now: number): GroupLedgerPatch => ({
  ...balancesOf(applyExpenseToBalances(group, expense, -1)),
  totalSpent: addToCurrencyTotals(group.totalSpent, expense.currency, -expense.amount),
  expensesCount: group.expensesCount - 1,
  ...touch(group, now),
});

/** Pending settlements never touch the balances until the receiver confirms them. */
export const addSettlementToGroup = (group: SplitGroup, settlement: Settlement, now: number): GroupLedgerPatch => ({
  ...(isPending(settlement) ? {} : balancesOf(applySettlementToBalances(group, settlement, 1))),
  settlementsCount: group.settlementsCount + 1,
  lastUsedCurrency: settlement.currency,
  ...touch(group, now),
});

/** Confirms a pending settlement; refuses it when it no longer fits the outstanding debt. */
export const confirmSettlementInGroup = (
  group: SplitGroup,
  settlement: Settlement,
  now: number,
): { settlement: Settlement; patch: GroupLedgerPatch } => {
  const maxDebt = getOutstandingDebtAmount(group, settlement.payerId, settlement.receiverId, settlement.currency);
  if (settlement.amount > maxDebt) throw new Error("planning:errors.settlementAmountExceedsDebt");

  const confirmed: Settlement = { ...settlement, status: "confirmed" };
  return {
    settlement: confirmed,
    patch: { ...balancesOf(applySettlementToBalances(group, confirmed, 1)), ...touch(group, now) },
  };
};

export const removeSettlementFromGroup = (group: SplitGroup, settlement: Settlement, now: number): GroupLedgerPatch => ({
  ...(isPending(settlement) ? {} : balancesOf(applySettlementToBalances(group, settlement, -1))),
  settlementsCount: Math.max(0, group.settlementsCount - 1),
  ...touch(group, now),
});

// ---------------------------------------------------------------------------
// Currency conversion
// ---------------------------------------------------------------------------

export type ExchangeRates = Map<string, ExchangeRate>;

export type RateSource = { currency: string; date: string };

export const getRateKey = (source: RateSource) => `${source.currency}|${source.date}`;

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

const getRate = (rates: ExchangeRates, source: RateSource) => {
  const exchangeRate = rates.get(getRateKey(source));
  if (!exchangeRate) throw new Error(`Missing exchange rate for ${source.currency} on ${source.date}`);
  return exchangeRate;
};

const convertExpense = (expense: Expense, targetCurrency: string, rates: ExchangeRates, now: number): Expense => {
  const source = getExpenseSource(expense);
  const { conversion: _conversion, ...base } = expense;

  if (source.currency === targetCurrency) {
    return { ...base, currency: targetCurrency, amount: source.amount, splits: source.splits };
  }

  const exchangeRate = getRate(rates, { currency: source.currency, date: expense.date });
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
      convertedAt: now,
    },
  };
};

const convertSettlement = (
  settlement: Settlement,
  targetCurrency: string,
  rates: ExchangeRates,
  now: number,
): Settlement => {
  const source = getSettlementSource(settlement);
  const { conversion: _conversion, ...base } = settlement;

  if (source.currency === targetCurrency) {
    return { ...base, currency: targetCurrency, amount: source.amount };
  }

  const exchangeRate = getRate(rates, { currency: source.currency, date: settlement.date });
  return {
    ...base,
    currency: targetCurrency,
    amount: convertAmount(source.amount, exchangeRate.rate),
    conversion: {
      originalCurrency: source.currency,
      originalAmount: source.amount,
      rate: exchangeRate.rate,
      rateDate: exchangeRate.date,
      convertedAt: now,
    },
  };
};

/** Unique (currency, date) pairs whose exchange rate the conversion of these entries needs. */
export const getRequiredRates = (expenses: Expense[], settlements: Settlement[], targetCurrency: string): RateSource[] => {
  const sources: RateSource[] = [
    ...expenses.map((expense) => ({ currency: getExpenseSource(expense).currency, date: expense.date })),
    ...settlements.map((settlement) => ({ currency: getSettlementSource(settlement).currency, date: settlement.date })),
  ];
  return Array.from(
    new Map(
      sources.filter((source) => source.currency !== targetCurrency).map((source) => [getRateKey(source), source]),
    ).values(),
  );
};

/**
 * Converts every entry not in `targetCurrency` with the rate of the entry's day and moves the balances
 * into `targetCurrency`. Returns only the entries that changed, plus the group changes.
 */
export const convertGroupCurrency = (
  group: SplitGroup,
  entries: { expenses: Expense[]; settlements: Settlement[] },
  targetCurrency: string,
  rates: ExchangeRates,
  now: number,
): { expenses: Expense[]; settlements: Settlement[]; patch: GroupLedgerPatch } => {
  let state: GroupBalanceState = { balances: group.balances, pairBalances: group.pairBalances };
  let totals = group.totalSpent;

  const expenses = entries.expenses
    .filter((expense) => expense.currency !== targetCurrency)
    .map((current) => {
      const next = convertExpense(current, targetCurrency, rates, now);
      state = applyExpenseToBalances(applyExpenseToBalances(state, current, -1), next, 1);
      totals = addToCurrencyTotals(addToCurrencyTotals(totals, current.currency, -current.amount), next.currency, next.amount);
      return next;
    });

  const toConvert = entries.settlements.filter((settlement) => settlement.currency !== targetCurrency);
  const converted = toConvert.map((current) => {
    const next = convertSettlement(current, targetCurrency, rates, now);
    // Pending settlements were never applied to balances, so they must not be reverted from them
    if (!isPending(current)) {
      state = applySettlementToBalances(applySettlementToBalances(state, current, -1), next, 1);
    }
    return { current, next };
  });

  // Per-entry rounding can push a pending amount a few minor units above the converted debt, which
  // would block its confirmation; cap it, but only if it fitted the debt before the conversion.
  const convertedGroup = { ...group, ...state };
  const settlements = converted.map(({ current, next }) => {
    if (!isPending(current)) return next;
    const debtBefore = getOutstandingDebtAmount(group, current.payerId, current.receiverId, current.currency);
    const debtAfter = getOutstandingDebtAmount(convertedGroup, current.payerId, current.receiverId, targetCurrency);
    const fitsDebt = current.amount <= debtBefore && debtAfter > 0;
    return fitsDebt ? { ...next, amount: Math.min(next.amount, debtAfter) } : next;
  });

  return {
    expenses,
    settlements,
    patch: {
      ...balancesOf(state),
      totalSpent: totals,
      lastUsedCurrency: targetCurrency,
      ...touch(group, now),
    },
  };
};
