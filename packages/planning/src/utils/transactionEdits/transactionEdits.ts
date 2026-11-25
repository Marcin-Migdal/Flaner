import type { BudgetTransaction, BudgetTransactionPatch } from "../../api/budget";

/**
 * A new amount with its main-currency amount: at the stored rate, or — when that amount was typed by hand — at the
 * hand-typed effective rate, so an override survives a corrected amount.
 */
export const amountPatch = (
  transaction: Pick<BudgetTransaction, "amount" | "amountMain" | "rate" | "rateOverridden">,
  amount: number,
): BudgetTransactionPatch => ({
  amount,
  amountMain:
    transaction.rateOverridden && transaction.amount > 0
      ? Math.round((transaction.amountMain * amount) / transaction.amount)
      : Math.round(amount * transaction.rate),
});

/** Setting or changing a category confirms it; clearing it leaves the transaction to review. */
export const categoryPatch = (categoryId: string | null): BudgetTransactionPatch => ({
  categoryId,
  confirmed: categoryId !== null,
});

/** A category still to approve (e.g. a rule's guess); a transaction without a category is uncategorized instead. */
export const hasUnconfirmedCategory = ({ categoryId, confirmed }: Pick<BudgetTransaction, "categoryId" | "confirmed">) =>
  categoryId !== null && !confirmed;
