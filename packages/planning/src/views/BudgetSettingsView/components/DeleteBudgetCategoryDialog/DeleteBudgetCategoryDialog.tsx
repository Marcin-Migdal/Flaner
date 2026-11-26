import { toast } from "@flaner/shared/utils";
import { useIsMutating } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import { useMemo, useState } from "react";
import type { BudgetCategoryRef, BudgetCategoryTree } from "../../../../api/budget";
import { CategoryPicker } from "../../../../components/CategoryPicker";
import { DELETE_BUDGET_CATEGORY_MUTATION_KEY as DELETE_MUTATION_KEY, useDeleteBudgetCategoryMutation } from "../../../../hooks/api/mutation";
import { useGetBudgetCategoryTransactionCountQuery } from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { categoryIdsOf, removeCategory } from "../../../../utils/categoryTree";
import { resolveTransactionCategory } from "../../../../utils/monthLedger";
import { deleteBudgetCategoryDialogStyles as styles } from "./DeleteBudgetCategoryDialog.styles";

export type DeleteBudgetCategoryDialogProps = {
  tree: BudgetCategoryTree;
  /** The category or subcategory to delete; open while set. */
  target: BudgetCategoryRef | null;
  onClose: () => void;
  actionsDisabled?: boolean;
};

type DialogBodyProps = Omit<DeleteBudgetCategoryDialogProps, "target"> & { target: BudgetCategoryRef };

const DialogBody = ({ tree, target, onClose, actionsDisabled }: DialogBodyProps) => {
  const { t } = usePlanningTranslations();
  const showWriteError = useBudgetWriteErrorToast();
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const { mutateAsync: deleteCategory, isPending } = useDeleteBudgetCategoryMutation();

  const ids = useMemo(() => categoryIdsOf(tree, target), [tree, target]);
  const count = useGetBudgetCategoryTransactionCountQuery(ids);
  // Same type only, never the deleted category or its subcategories
  const candidates = useMemo(() => removeCategory(tree, target), [tree, target]);

  const resolved = resolveTransactionCategory(tree, target);
  const name = resolved ? (resolved.subcategory?.name ?? resolved.category.name) : "";
  const subcategories = resolved && !resolved.subcategory ? resolved.category.subcategories.length : 0;

  const confirm = async () => {
    try {
      await deleteCategory({ ...target, replacementId });
      toast.success(t("toasts.budget.categoryDeleted"));
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void confirm(), fallbackKey: "toasts.budget.categoryDeleteError" });
      }
    }
  };

  const usageText = () => {
    if (count.isPending) return t("budget.categories.deleteDialog.counting");
    if (count.isError) return t("budget.categories.deleteDialog.countUnavailable");
    return t("budget.categories.deleteDialog.usage", { count: count.data });
  };

  return (
    <DialogContent showCloseButton={!isPending}>
      <DialogHeader>
        <DialogTitle>{t("budget.categories.deleteDialog.title", { name })}</DialogTitle>
        <DialogDescription aria-live="polite">
          {subcategories > 0 && `${t("budget.categories.deleteDialog.subcategories", { count: subcategories })} `}
          {usageText()}
        </DialogDescription>
      </DialogHeader>
      <CategoryPicker
        tree={candidates}
        type={target.type}
        value={replacementId}
        onChange={setReplacementId}
        label={t("budget.categories.deleteDialog.replacement")}
        placeholder={t("budget.categories.deleteDialog.noReplacement")}
        disabled={isPending}
      />
      <p className={styles.hint}>{t("budget.categories.deleteDialog.hint")}</p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t("budget.actions.cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          isBusy={isPending}
          // The count is shown before anything can be deleted
          disabled={actionsDisabled || !count.isSuccess}
          onClick={() => void confirm()}
        >
          {t("budget.categories.deleteDialog.confirm")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

/**
 * Delete category: how many transactions use it (and its subcategories) and an optional replacement of the same type.
 * With one, its transactions, split-offs, recurring transactions and rules move to it; without, its transactions read
 * as Uncategorized and unconfirmed and its rules are deleted.
 */
export const DeleteBudgetCategoryDialog = ({ target, onClose, ...props }: DeleteBudgetCategoryDialogProps) => {
  const isDeleting = useIsMutating({ mutationKey: DELETE_MUTATION_KEY }) > 0;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      {/* Keyed by the target, so the replacement starts empty for each category */}
      {target && <DialogBody key={`${target.type}:${target.categoryId}`} target={target} onClose={onClose} {...props} />}
    </Dialog>
  );
};
