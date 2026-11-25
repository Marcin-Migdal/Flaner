import type { BudgetLinkRef, BudgetSplitOff, BudgetTransaction, BudgetTransactionRef } from "../../api/budget";

/**
 * Split-off and refund maths (GLOSSARY → Split-off, Linked refund). Pure: split-off amounts are in the transaction's
 * currency and carved out of it; main-currency amounts follow the transaction's own `amountMain / amount` ratio.
 */

const splitOffsOf = (transaction: Pick<BudgetTransaction, "splitOffs">) => transaction.splitOffs ?? [];

/** What the transaction counts itself: its total minus every split-off (transaction currency). */
export const splitRest = (transaction: Pick<BudgetTransaction, "amount" | "splitOffs">) =>
  transaction.amount - splitOffsOf(transaction).reduce((sum, splitOff) => sum + splitOff.amount, 0);

/** A split-off's amount in the main currency. */
export const splitOffAmountMain = (
  transaction: Pick<BudgetTransaction, "amount" | "amountMain">,
  splitOff: Pick<BudgetSplitOff, "amount">,
) => (transaction.amount > 0 ? Math.round((splitOff.amount * transaction.amountMain) / transaction.amount) : 0);

/**
 * The counted parts of a transaction, as rows the ledger groups by category: the transaction with its rest under
 * its own category, then each split-off that is not excluded under its category (id `<transaction>/<split-off>`,
 * its note as the description). The rest takes the rounding, so the parts add up to `amountMain`. Excluded: none.
 */
export const ledgerEntries = (transaction: BudgetTransaction): BudgetTransaction[] => {
  if (transaction.excluded) return [];
  const splitOffs = splitOffsOf(transaction);
  if (splitOffs.length === 0) return [transaction];

  const mains = splitOffs.map((splitOff) => splitOffAmountMain(transaction, splitOff));
  const rest: BudgetTransaction = {
    ...transaction,
    amount: splitRest(transaction),
    amountMain: transaction.amountMain - mains.reduce((sum, main) => sum + main, 0),
  };
  const parts = splitOffs.flatMap((splitOff, index): BudgetTransaction[] =>
    splitOff.excluded
      ? []
      : [
          {
            ...transaction,
            id: `${transaction.id}/${splitOff.id}`,
            amount: splitOff.amount,
            amountMain: mains[index],
            categoryId: splitOff.categoryId,
            description: splitOff.note || transaction.description,
            splitOffs: [],
          },
        ],
  );
  return [rest, ...parts];
};

/** The main-currency amount a transaction counts: without excluded split-offs; 0 when it is excluded. */
export const countedAmountMain = (transaction: BudgetTransaction) =>
  ledgerEntries(transaction).reduce((sum, entry) => sum + entry.amountMain, 0);

/** Where a transaction is stored, as a link points at it. */
export const linkRefOf = ({ id, accountId, date }: BudgetTransactionRef): BudgetLinkRef => ({
  transactionId: id,
  accountId,
  month: date.slice(0, 7),
});

/** Part of a link (a linked refund, or a purchase with a refund split-off). */
export const isRefundLinked = (transaction: BudgetTransaction) =>
  !!transaction.refundOf || splitOffsOf(transaction).some((splitOff) => !!splitOff.refund);

/**
 * How much a refund can take (transaction currency): less than the purchase's rest, or less than the split-off it
 * is carved out of (a split-off sum must stay below the total, and a split-off above zero).
 */
export const refundRoom = (purchase: BudgetTransaction, splitOffId?: string) => {
  if (splitOffId === undefined) return splitRest(purchase);
  return splitOffsOf(purchase).find((splitOff) => splitOff.id === splitOffId)?.amount ?? 0;
};

/** A refund's amount in the purchase's currency: as is in the same currency, else through main-currency amounts. */
export const refundAmountFor = (purchase: BudgetTransaction, refund: BudgetTransaction) =>
  refund.currency === purchase.currency || purchase.amountMain <= 0
    ? refund.amount
    : Math.round((refund.amountMain * purchase.amount) / purchase.amountMain);

/**
 * Refunds a purchase (or its split-off) can be linked to: incoming, not excluded, not linked yet, dated on or after
 * the purchase, and smaller than the room left (`refundRoom`). In the given order.
 */
export const refundCandidates = (
  purchase: BudgetTransaction,
  splitOffId: string | undefined,
  transactions: BudgetTransaction[],
): BudgetTransaction[] => {
  const room = refundRoom(purchase, splitOffId);
  return transactions.filter(
    (candidate) =>
      candidate.type === "income" &&
      !candidate.excluded &&
      !candidate.refundOf &&
      candidate.date >= purchase.date &&
      refundAmountFor(purchase, candidate) < room,
  );
};
