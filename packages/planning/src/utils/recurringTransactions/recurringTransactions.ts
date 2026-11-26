import { differenceInCalendarDays, endOfMonth, format, parseISO } from "date-fns";
import type {
  BudgetMonth,
  BudgetRecurring,
  BudgetRecurringMatch,
  BudgetTransaction,
} from "../../api/budget";
import { nextOccurrence, occurrencesBetween, shiftDay } from "../repeatRules";

/**
 * Recurring transactions: automatic occurrence matching and the statuses the Recurring tab (and later the Planner and
 * Summary) show. Pure — takes decrypted recurring transactions and transactions.
 */

/** A transaction matches an occurrence due at most this many days before or after its date. */
export const MATCH_WINDOW_DAYS = 7;

export type OccurrenceStatus = "paid" | "upcoming" | "overdue";

const normalizePayee = (payee: string) => payee.trim().toLocaleLowerCase();

/** Calendar days between two `YYYY-MM-DD` days, either order. */
export const daysApart = (a: string, b: string) => Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));

/** Same account, direction, payee and category, not excluded, within ±7 days of `dueDate`. */
export const matchesOccurrence = (recurring: BudgetRecurring, transaction: BudgetTransaction, dueDate: string) =>
  transaction.accountId === recurring.accountId &&
  transaction.type === recurring.type &&
  !transaction.excluded &&
  transaction.categoryId === recurring.categoryId &&
  normalizePayee(transaction.payee) === normalizePayee(recurring.payee) &&
  daysApart(transaction.date, dueDate) <= MATCH_WINDOW_DAYS;

export const toMatch = ({ id, date, amount, amountMain }: BudgetTransaction): BudgetRecurringMatch => ({
  transactionId: id,
  date,
  amount,
  amountMain,
});

/**
 * Re-matches the occurrences due in `from`..`to` against `pool` — every transaction of the account dated within
 * 7 days of that window (so every candidate of those occurrences is known). Matches due outside the window stay;
 * a stored match that is not on the current rule (history from before an edit) stays while its transaction still
 * fits; a manual link stays while its transaction exists (and is not excluded). Each occurrence on the rule takes the closest fitting transaction no other occurrence uses, closest pairs
 * first, skipping transactions unlinked from it by hand; recurring transactions earlier in `list` choose first.
 */
export const rematchRecurring = (
  list: BudgetRecurring[],
  pool: BudgetTransaction[],
  { from, to }: { from: string; to: string },
): BudgetRecurring[] => {
  const byId = new Map(pool.map((transaction) => [transaction.id, transaction]));
  const dues = list.map((recurring) => occurrencesBetween(recurring.rule, from, to));

  // `pool` holds every transaction of the account dated in this range, so a match dated in it but missing is gone
  const poolFrom = shiftDay(from, -MATCH_WINDOW_DAYS);
  const poolTo = shiftDay(to, MATCH_WINDOW_DAYS);

  const kept = list.map((recurring, index) => {
    const onRule = new Set(dues[index]);
    return Object.fromEntries(
      Object.entries(recurring.occurrences).flatMap(([dueDate, match]): [string, BudgetRecurringMatch][] => {
        const transaction = byId.get(match.transactionId);
        if (match.manual) {
          if (match.date < poolFrom || match.date > poolTo) return [[dueDate, match]];
          return transaction && !transaction.excluded ? [[dueDate, { ...toMatch(transaction), manual: true }]] : [];
        }
        if (dueDate < from || dueDate > to) return [[dueDate, match]];
        if (onRule.has(dueDate) || !transaction || !matchesOccurrence(recurring, transaction, dueDate)) return [];
        return [[dueDate, toMatch(transaction)]];
      }),
    );
  });
  const used = new Set(kept.flatMap((occurrences) => Object.values(occurrences).map((match) => match.transactionId)));

  return list.map((recurring, index) => {
    const occurrences = { ...kept[index] };
    const pairs = dues[index]
      .flatMap((dueDate) =>
        pool
          .filter(
            (transaction) =>
              !used.has(transaction.id) &&
              !recurring.unlinked?.[dueDate]?.includes(transaction.id) &&
              matchesOccurrence(recurring, transaction, dueDate),
          )
          .map((transaction) => ({ dueDate, transaction, distance: daysApart(transaction.date, dueDate) })),
      )
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          a.dueDate.localeCompare(b.dueDate) ||
          a.transaction.date.localeCompare(b.transaction.date) ||
          a.transaction.id.localeCompare(b.transaction.id),
      );
    for (const { dueDate, transaction } of pairs) {
      if (occurrences[dueDate] || used.has(transaction.id)) continue;
      occurrences[dueDate] = toMatch(transaction);
      used.add(transaction.id);
    }
    return { ...recurring, occurrences };
  });
};

/** The amount expected next: the last paid occurrence's, else the amount the recurring transaction was made from. */
export const expectedAmount = ({ occurrences, amount, amountMain }: BudgetRecurring) => {
  const lastPaid = Object.keys(occurrences).sort().at(-1);
  return lastPaid ? { amount: occurrences[lastPaid].amount, amountMain: occurrences[lastPaid].amountMain } : { amount, amountMain };
};

/** Paid if matched, upcoming before (and on) the due date, overdue after it. */
export const occurrenceStatus = (recurring: BudgetRecurring, dueDate: string, today: string): OccurrenceStatus => {
  if (recurring.occurrences[dueDate]) return "paid";
  return dueDate < today ? "overdue" : "upcoming";
};

/** The first unpaid occurrence on or after `today`, or `null` once the rule has ended. */
export const nextDueDate = (recurring: BudgetRecurring, today: string): string | null => {
  let day: string | null = today;
  while (day !== null) {
    day = nextOccurrence(recurring.rule, day);
    if (day === null || !recurring.occurrences[day]) return day;
    day = shiftDay(day, 1);
  }
  return null;
};

/**
 * The first unpaid occurrence due before `today` after the last paid one (from `start` when none is paid), or `null`
 * when nothing is overdue: the row shows "Overdue since" it instead of the next due date.
 */
export const overdueSince = (recurring: BudgetRecurring, today: string): string | null => {
  const lastPaid = Object.keys(recurring.occurrences).sort().at(-1);
  const [first] = occurrencesBetween(
    recurring.rule,
    lastPaid ? shiftDay(lastPaid, 1) : recurring.rule.start,
    shiftDay(today, -1),
  );
  return first ?? null;
};

export type RecurringOccurrence = { dueDate: string; status: OccurrenceStatus; match?: BudgetRecurringMatch };

/** Occurrences due in `from`..`to`: the rule's plus stored matches from before an edit, newest first. */
export const recurringOccurrences = (
  recurring: BudgetRecurring,
  { from, to }: { from: string; to: string },
  today: string,
): RecurringOccurrence[] => {
  const stored = Object.keys(recurring.occurrences).filter((dueDate) => dueDate >= from && dueDate <= to);
  return [...new Set([...occurrencesBetween(recurring.rule, from, to), ...stored])]
    .sort((a, b) => b.localeCompare(a))
    .map((dueDate) => ({
      dueDate,
      status: occurrenceStatus(recurring, dueDate, today),
      match: recurring.occurrences[dueDate],
    }));
};

const monthRange = (month: BudgetMonth) => ({
  from: `${month}-01`,
  to: format(endOfMonth(parseISO(`${month}-01`)), "yyyy-MM-dd"),
});

/** Occurrences due in `month` (`recurringOccurrences` over the whole month). */
export const monthOccurrences = (recurring: BudgetRecurring, month: BudgetMonth, today: string) =>
  recurringOccurrences(recurring, monthRange(month), today);

const STATUS_PRIORITY: OccurrenceStatus[] = ["overdue", "upcoming", "paid"];

/** The month's status: overdue if any occurrence is, else upcoming if any is, else paid; `null` with none due. */
export const monthStatus = (recurring: BudgetRecurring, month: BudgetMonth, today: string): OccurrenceStatus | null => {
  const statuses = recurringOccurrences(recurring, monthRange(month), today).map(({ status }) => status);
  return STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? null;
};

/** The month's total in the main currency: paid occurrences at their amount, the rest at the expected amount. */
export const monthAmountMain = (recurring: BudgetRecurring, month: BudgetMonth, today: string) => {
  const expected = expectedAmount(recurring).amountMain;
  return recurringOccurrences(recurring, monthRange(month), today).reduce(
    (sum, { match }) => sum + (match ? match.amountMain : expected),
    0,
  );
};

/** Transaction ids matched to any recurring transaction (the list's recurring marker). */
export const recurringTransactionIds = (list: BudgetRecurring[]) =>
  new Set(list.flatMap((recurring) => Object.values(recurring.occurrences).map((match) => match.transactionId)));
