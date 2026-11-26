import { EmptyState, LoadingFallback } from "@flaner/ui-components";
import { useState } from "react";
import {
  BUDGET_CATEGORY_TYPES,
  type BudgetCategoryRef,
  type BudgetCategoryTreeChange,
} from "../../../../api/budget";
import { useUpdateBudgetCategoriesMutation } from "../../../../hooks/api/mutation";
import { useGetBudgetCategoriesQuery } from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { reorderCategories } from "../../../../utils/categoryTree";
import { BudgetCategoryDialog, type BudgetCategoryDialogTarget } from "../BudgetCategoryDialog";
import { CategoryTreeCard } from "../CategoryTreeCard";
import { DeleteBudgetCategoryDialog } from "../DeleteBudgetCategoryDialog";
import { budgetCategoriesSectionStyles as styles } from "./BudgetCategoriesSection.styles";

/**
 * Settings → Categories: the expense and income trees, each editable (add, rename, icon and colour on main categories,
 * reorder by dragging or keyboard, delete with an optional replacement). Every change is saved at once.
 */
export const BudgetCategoriesSection = () => {
  const { t } = usePlanningTranslations();
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();
  const categories = useGetBudgetCategoriesQuery();
  const { mutateAsync: updateCategories } = useUpdateBudgetCategoriesMutation();

  const [editing, setEditing] = useState<BudgetCategoryDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<BudgetCategoryRef | null>(null);

  const save = async (change: BudgetCategoryTreeChange) => {
    try {
      await updateCategories(change);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void save(change), fallbackKey: "toasts.budget.categorySaveError" });
      }
    }
  };

  if (categories.isPending) return <LoadingFallback />;
  if (categories.isError || !categories.data) return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
  const tree = categories.data;

  return (
    <>
      <p className={styles.hint}>{t("budget.categories.hint")}</p>
      <div className={styles.grid}>
        {BUDGET_CATEGORY_TYPES.map((type) => (
          <CategoryTreeCard
            key={type}
            type={type}
            categories={tree[type]}
            disabled={!isOnline}
            onAdd={(parent) => setEditing({ type, parent, editing: null })}
            onEdit={(item, parent) => setEditing({ type, parent, editing: item })}
            onDelete={(categoryId) => setDeleting({ type, categoryId })}
            onMove={(parentId, activeId, overId) =>
              void save((current) => reorderCategories(current, type, parentId, activeId, overId))
            }
          />
        ))}
      </div>

      <BudgetCategoryDialog target={editing} onClose={() => setEditing(null)} saveDisabled={!isOnline} />
      <DeleteBudgetCategoryDialog
        tree={tree}
        target={deleting}
        onClose={() => setDeleting(null)}
        actionsDisabled={!isOnline}
      />
    </>
  );
};
