import type { AmountsByCurrency, Expense, ExpenseSplit, Settlement, SplitGroup } from "../api/splits/types";
import { calculateSimplifiedDebts, type Debt } from "./debtSimplification";

export type GroupBalanceState = Pick<SplitGroup, "balances" | "pairBalances"> & {
  simplifyDebts?: boolean;
};

type CurrencyBalanceState = {
  balances: Record<string, number>;
  pairBalances: Record<string, number>;
};

type BalanceDirection = 1 | -1;

const PAIR_KEY_SEPARATOR = "__";

export const getPairKey = (userA: string, userB: string): string =>
  userA < userB ? `${userA}${PAIR_KEY_SEPARATOR}${userB}` : `${userB}${PAIR_KEY_SEPARATOR}${userA}`;

const setOrRemove = (record: Record<string, number>, key: string, value: number): Record<string, number> => {
  const { [key]: _previous, ...rest } = record;
  return value === 0 ? rest : { ...rest, [key]: value };
};

/**
 * Records that `debtorId` owes `creditorId` an additional `amount` (negative amount reduces the debt).
 */
const addDebt = (
  state: CurrencyBalanceState,
  debtorId: string,
  creditorId: string,
  amount: number,
): CurrencyBalanceState => {
  if (amount === 0 || debtorId === creditorId) return state;

  let balances = setOrRemove(state.balances, debtorId, (state.balances[debtorId] ?? 0) - amount);
  balances = setOrRemove(balances, creditorId, (balances[creditorId] ?? 0) + amount);

  const key = getPairKey(debtorId, creditorId);
  const signedAmount = creditorId < debtorId ? amount : -amount;
  const pairBalances = setOrRemove(state.pairBalances, key, (state.pairBalances[key] ?? 0) + signedAmount);

  return { balances, pairBalances };
};

const updateCurrency = (
  state: GroupBalanceState,
  currency: string,
  updater: (current: CurrencyBalanceState) => CurrencyBalanceState,
): GroupBalanceState => {
  const next = updater({
    balances: state.balances[currency] ?? {},
    pairBalances: state.pairBalances[currency] ?? {},
  });

  const { [currency]: _balances, ...otherBalances } = state.balances;
  const { [currency]: _pairs, ...otherPairs } = state.pairBalances;

  const nextBalances =
    Object.keys(next.balances).length === 0 ? otherBalances : { ...otherBalances, [currency]: next.balances };
  const nextPairs =
    Object.keys(next.pairBalances).length === 0 ? otherPairs : { ...otherPairs, [currency]: next.pairBalances };

  return {
    ...state,
    balances: nextBalances,
    pairBalances: nextPairs,
  };
};

export const applyExpenseToBalances = (
  state: GroupBalanceState,
  expense: Pick<Expense, "paidBy" | "splits" | "currency">,
  direction: BalanceDirection,
): GroupBalanceState =>
  updateCurrency(state, expense.currency, (current) =>
    expense.splits.reduce((acc, split) => addDebt(acc, split.userId, expense.paidBy, split.amount * direction), current),
  );

export const applySettlementToBalances = (
  state: GroupBalanceState,
  settlement: Pick<Settlement, "payerId" | "receiverId" | "amount" | "currency">,
  direction: BalanceDirection,
): GroupBalanceState =>
  updateCurrency(state, settlement.currency, (current) =>
    addDebt(current, settlement.payerId, settlement.receiverId, -settlement.amount * direction),
  );

export const addToCurrencyTotals = (totals: AmountsByCurrency, currency: string, delta: number): AmountsByCurrency =>
  setOrRemove(totals, currency, (totals[currency] ?? 0) + delta);

/** Non-zero balances of a user, keyed by currency. */
export const getUserBalances = (state: GroupBalanceState, userId: string): AmountsByCurrency =>
  Object.fromEntries(
    Object.entries(state.balances)
      .map(([currency, balances]): [string, number] => [currency, balances[userId] ?? 0])
      .filter(([, amount]) => amount !== 0),
  );

export const hasOutstandingBalance = (state: GroupBalanceState, userId: string): boolean => {
  if (state.simplifyDebts) {
    return Object.keys(getUserBalances(state, userId)).length > 0;
  }
  return Object.values(state.pairBalances ?? {}).some((pairs) =>
    Object.entries(pairs ?? {}).some(([key, amount]) => {
      if (amount === 0) return false;
      const [userA, userB] = key.split(PAIR_KEY_SEPARATOR);
      return userA === userId || userB === userId;
    }),
  );
};

export const isGroupSettled = (state: GroupBalanceState): boolean => {
  if (state.simplifyDebts) {
    return !Object.values(state.balances ?? {}).some((currencyBalances) =>
      Object.values(currencyBalances ?? {}).some((amount) => amount !== 0),
    );
  }
  return !Object.values(state.pairBalances ?? {}).some((pairs) =>
    Object.values(pairs ?? {}).some((amount) => amount !== 0),
  );
};

/** Direct (non-simplified) debts derived from pairwise balances, across all currencies. */
export const getPairwiseDebts = (pairBalances: SplitGroup["pairBalances"]): Debt[] =>
  Object.entries(pairBalances).flatMap(([currency, pairs]) =>
    Object.entries(pairs).flatMap(([key, value]): Debt[] => {
      const [userA, userB] = key.split(PAIR_KEY_SEPARATOR);
      if (!userA || !userB || value === 0) return [];
      return value > 0
        ? [{ from: userB, to: userA, amount: value, currency }]
        : [{ from: userA, to: userB, amount: -value, currency }];
    }),
  );

/** Simplified debts, calculated separately for each currency. */
export const getSimplifiedDebts = (balances: SplitGroup["balances"]): Debt[] =>
  Object.entries(balances).flatMap(([currency, currencyBalances]) =>
    calculateSimplifiedDebts(currencyBalances, currency),
  );

export type UserDebtSummary = {
  youOwe: AmountsByCurrency;
  youOweCount: number;
  owedToYou: AmountsByCurrency;
  owedToYouCount: number;
};

export const summarizeUserDebts = (debts: Debt[], userId: string): UserDebtSummary => {
  const creditors = new Set<string>();
  const debtors = new Set<string>();
  let youOwe: AmountsByCurrency = {};
  let owedToYou: AmountsByCurrency = {};

  debts.forEach((debt) => {
    if (debt.from === userId) {
      creditors.add(debt.to);
      youOwe = addToCurrencyTotals(youOwe, debt.currency, debt.amount);
    } else if (debt.to === userId) {
      debtors.add(debt.from);
      owedToYou = addToCurrencyTotals(owedToYou, debt.currency, debt.amount);
    }
  });

  return { youOwe, youOweCount: creditors.size, owedToYou, owedToYouCount: debtors.size };
};

export const convertAmount = (amount: number, rate: number): number => Math.round(amount * rate);

/**
 * Converts split amounts proportionally and assigns the rounding difference to the largest split,
 * so the converted splits always add up to `convertedTotal`.
 */
export const convertSplits = (splits: ExpenseSplit[], rate: number, convertedTotal: number): ExpenseSplit[] => {
  const converted = splits.map((split) => ({ userId: split.userId, amount: convertAmount(split.amount, rate) }));
  const difference = convertedTotal - converted.reduce((sum, split) => sum + split.amount, 0);
  if (difference === 0 || converted.length === 0) return converted;

  const largestIndex = converted.reduce(
    (maxIndex, split, index, all) => (split.amount > all[maxIndex].amount ? index : maxIndex),
    0,
  );
  return converted.map((split, index) =>
    index === largestIndex ? { ...split, amount: split.amount + difference } : split,
  );
};

/**
 * Calculates the maximum outstanding debt that `payerId` owes `receiverId` in `currency`.
 * Checks the active debt mode (simplified vs pairwise) to ensure users cannot overpay.
 */
export const getOutstandingDebtAmount = (
  group: SplitGroup,
  payerId: string,
  receiverId: string,
  currency: string,
): number => {
  const pairwiseDebt =
    getPairwiseDebts(group.pairBalances).find(
      (d) => d.from === payerId && d.to === receiverId && d.currency === currency,
    )?.amount ?? 0;

  const simplifiedDebt =
    getSimplifiedDebts(group.balances).find(
      (d) => d.from === payerId && d.to === receiverId && d.currency === currency,
    )?.amount ?? 0;

  if (group.simplifyDebts) {
    return Math.max(simplifiedDebt, pairwiseDebt);
  }
  return pairwiseDebt;
};
