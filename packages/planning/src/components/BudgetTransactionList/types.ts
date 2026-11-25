import type { BudgetLinkRef, BudgetSplitOff, BudgetTransaction } from "../../api/budget";

/** Split-off, exclusion and refund actions of the expanded rows (Transactions only, never the import preview). */
export type TransactionSplitActions = {
  onToggleExcluded: (transaction: BudgetTransaction) => void;
  onSplitOff: (transaction: BudgetTransaction) => void;
  onEditSplitOff: (transaction: BudgetTransaction, splitOff: BudgetSplitOff) => void;
  onToggleSplitOffExcluded: (transaction: BudgetTransaction, splitOff: BudgetSplitOff) => void;
  onRemoveSplitOff: (transaction: BudgetTransaction, splitOff: BudgetSplitOff) => void;
  /** Links a refund to the purchase, or to one of its split-offs. */
  onLinkRefund: (transaction: BudgetTransaction, splitOff?: BudgetSplitOff) => void;
  /** `refund`: where the refund is stored (a linked refund's own place, or a refund split-off's `refund`). */
  onUnlinkRefund: (refund: BudgetLinkRef) => void;
};
