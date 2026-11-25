import { useState, type ReactNode } from "react";
import type { BudgetAccount, BudgetCategoryTree, BudgetSplitOff, BudgetTransaction } from "../../api/budget";
import type { TransactionSplitActions } from "../../components/BudgetTransactionList";
import { RefundLinkDialog } from "../../components/RefundLinkDialog";
import { SplitOffDialog } from "../../components/SplitOffDialog";
import {
  useRemoveBudgetSplitOffMutation,
  useUnlinkBudgetRefundMutation,
  useUpdateBudgetSplitOffMutation,
  useUpdateBudgetTransactionsMutation,
} from "../api/mutation";
import { useBudgetWriteErrorToast } from "../useBudgetWriteErrorToast";

type SplitOffTarget = { transaction: BudgetTransaction; splitOff: BudgetSplitOff | null };
type RefundTarget = { purchase: BudgetTransaction; splitOff: BudgetSplitOff | null };

/**
 * The split-off, exclusion and refund actions of the Transactions list, and the dialogs they open (render `dialogs`
 * once in the view). One-click actions (exclude / restore, remove a split-off, unlink) save at once and report a
 * failure with the No connection / budget error toast.
 */
export const useTransactionSplitActions = ({
  accounts,
  categories,
  saveDisabled,
}: {
  accounts: BudgetAccount[] | undefined;
  categories: BudgetCategoryTree | null | undefined;
  saveDisabled: boolean;
}): { splitActions: TransactionSplitActions; dialogs: ReactNode } => {
  const showWriteError = useBudgetWriteErrorToast();
  const [splitOffTarget, setSplitOffTarget] = useState<SplitOffTarget | null>(null);
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null);
  const { mutateAsync: updateTransactions } = useUpdateBudgetTransactionsMutation();
  const { mutateAsync: updateSplitOff } = useUpdateBudgetSplitOffMutation();
  const { mutateAsync: removeSplitOff } = useRemoveBudgetSplitOffMutation();
  const { mutateAsync: unlinkRefund } = useUnlinkBudgetRefundMutation();

  const run = <T,>(write: () => Promise<T>) => {
    write().catch((error: Error) => {
      showWriteError(error, { retry: () => run(write), fallbackKey: "toasts.budget.saveError" });
    });
  };

  const splitActions: TransactionSplitActions = {
    onToggleExcluded: (transaction) =>
      run(() => updateTransactions([{ ref: transaction, patch: { excluded: !transaction.excluded } }])),
    onSplitOff: (transaction) => setSplitOffTarget({ transaction, splitOff: null }),
    onEditSplitOff: (transaction, splitOff) => setSplitOffTarget({ transaction, splitOff }),
    onToggleSplitOffExcluded: (transaction, splitOff) =>
      run(() => updateSplitOff({ ref: transaction, splitOffId: splitOff.id, patch: { excluded: !splitOff.excluded } })),
    onRemoveSplitOff: (transaction, splitOff) => run(() => removeSplitOff({ ref: transaction, splitOffId: splitOff.id })),
    onLinkRefund: (purchase, splitOff) => setRefundTarget({ purchase, splitOff: splitOff ?? null }),
    onUnlinkRefund: (refund) => run(() => unlinkRefund(refund)),
  };

  const dialogs = (
    <>
      {splitOffTarget && categories && (
        <SplitOffDialog
          open
          onOpenChange={(open) => !open && setSplitOffTarget(null)}
          transaction={splitOffTarget.transaction}
          splitOff={splitOffTarget.splitOff}
          categories={categories}
          saveDisabled={saveDisabled}
        />
      )}
      {refundTarget && accounts && (
        <RefundLinkDialog
          open
          onOpenChange={(open) => !open && setRefundTarget(null)}
          purchase={refundTarget.purchase}
          splitOff={refundTarget.splitOff}
          accounts={accounts}
          saveDisabled={saveDisabled}
        />
      )}
    </>
  );

  return { splitActions, dialogs };
};
