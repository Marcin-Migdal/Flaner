import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import { CheckCheck, Eye, EyeOff, Tags, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { BudgetCategoryTree, BudgetTransaction } from "../../../../api/budget";
import { CategoryPicker } from "../../../../components/CategoryPicker";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { budgetBulkActionsStyles as styles } from "./BudgetBulkActions.styles";

export type BudgetBulkActionsProps = {
  selected: BudgetTransaction[];
  categories: BudgetCategoryTree;
  onSetCategory: (categoryId: string | null) => Promise<void>;
  onConfirm: () => void;
  /** Excludes the selected relevant transactions. */
  onExclude: () => void;
  /** Restores the selected excluded transactions (a linked refund stays excluded until unlinked). */
  onRestore: () => void;
  onDelete: () => void;
  onClear: () => void;
  /** Disables the actions (offline, or a bulk write running). */
  disabled?: boolean;
};

/** Bulk actions for the selected transactions: set category, confirm, exclude / restore, delete. */
export const BudgetBulkActions = ({
  selected,
  categories,
  onSetCategory,
  onConfirm,
  onExclude,
  onRestore,
  onDelete,
  onClear,
  disabled,
}: BudgetBulkActionsProps) => {
  const { t } = usePlanningTranslations();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const count = selected.length;
  // A category belongs to one type's tree
  const types = new Set(selected.map((transaction) => transaction.type));
  const [type] = types;
  const canSetCategory = types.size === 1;
  const canExclude = selected.some((transaction) => !transaction.excluded);
  const canRestore = selected.some((transaction) => transaction.excluded && !transaction.refundOf);

  const saveCategory = async () => {
    setIsSaving(true);
    try {
      await onSetCategory(categoryId);
      setIsCategoryOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.root} role="toolbar" aria-label={t("budget.bulkActions.label")}>
      <span className={styles.count} aria-live="polite">
        {t("budget.bulkActions.selected", { count })}
      </span>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canSetCategory}
          title={canSetCategory ? undefined : t("budget.bulkActions.mixedTypes")}
          onClick={() => {
            setCategoryId(null);
            setIsCategoryOpen(true);
          }}
        >
          <Tags aria-hidden="true" />
          {t("budget.bulkActions.setCategory")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onConfirm}>
          <CheckCheck aria-hidden="true" />
          {t("budget.bulkActions.confirm")}
        </Button>
        {canExclude && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onExclude}>
            <EyeOff aria-hidden="true" />
            {t("budget.exclusion.exclude")}
          </Button>
        )}
        {canRestore && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRestore}>
            <Eye aria-hidden="true" />
            {t("budget.exclusion.restore")}
          </Button>
        )}
        <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          {t("budget.bulkActions.delete")}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("budget.bulkActions.clear")} onClick={onClear}>
          <X aria-hidden="true" />
        </Button>
      </div>

      {type && (
        <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
          <DialogContent className={styles.dialog}>
            <DialogHeader>
              <DialogTitle>{t("budget.bulkActions.setCategoryTitle", { count })}</DialogTitle>
            </DialogHeader>
            <CategoryPicker
              label={t("budget.bulkActions.category")}
              tree={categories}
              type={type}
              value={categoryId}
              onChange={setCategoryId}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryOpen(false)} disabled={isSaving}>
                {t("budget.bulkActions.cancel")}
              </Button>
              <Button type="button" variant="brand" isBusy={isSaving} disabled={disabled || !categoryId} onClick={() => void saveCategory()}>
                {t("budget.bulkActions.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
