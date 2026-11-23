import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import type { BudgetAccount } from "../../../../api/budget";
import { useDeleteBudgetAccountMutation } from "../../../../hooks/api/mutation";
import { useGetBudgetAccountTransactionCountQuery } from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { deleteBudgetAccountDialogStyles as styles } from "./DeleteBudgetAccountDialog.styles";

export type DeleteBudgetAccountDialogProps = {
  /** The account to delete; the dialog is open while it is set. */
  account: BudgetAccount | null;
  onClose: () => void;
  /** Hide instead: hides the account and closes the dialog. */
  onHide: (account: BudgetAccount) => void;
  actionsDisabled?: boolean;
};

/** Delete account: says how many transactions go with it and suggests hiding it instead. */
export const DeleteBudgetAccountDialog = ({ account, onClose, onHide, actionsDisabled }: DeleteBudgetAccountDialogProps) => {
  const { t } = usePlanningTranslations();
  const showWriteError = useBudgetWriteErrorToast();
  const count = useGetBudgetAccountTransactionCountQuery(account?.id ?? null);
  const { mutateAsync: deleteAccount, isPending } = useDeleteBudgetAccountMutation();

  const confirm = async (target: BudgetAccount) => {
    try {
      await deleteAccount(target.id);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void confirm(target), fallbackKey: "toasts.budget.accountDeleteError" });
      }
    }
  };

  const descriptionText = () => {
    if (count.isPending) return t("budget.accounts.delete.counting");
    if (count.isError) return t("budget.accounts.delete.countUnavailable");
    return t("budget.accounts.delete.description", { name: account?.name, count: count.data });
  };

  return (
    <Dialog open={account !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("budget.accounts.delete.title", { name: account?.name })}</DialogTitle>
          <DialogDescription aria-live="polite">{descriptionText()}</DialogDescription>
        </DialogHeader>
        {!account?.hidden && <p className={styles.hint}>{t("budget.accounts.delete.hideHint")}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t("budget.actions.cancel")}
          </Button>
          {account && !account.hidden && (
            <Button type="button" variant="outline" onClick={() => onHide(account)} disabled={isPending || actionsDisabled}>
              {t("budget.accounts.delete.hideInstead")}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            isBusy={isPending}
            // The count is shown before anything can be deleted
            disabled={actionsDisabled || !count.isSuccess}
            onClick={() => account && void confirm(account)}
          >
            {t("budget.accounts.delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
