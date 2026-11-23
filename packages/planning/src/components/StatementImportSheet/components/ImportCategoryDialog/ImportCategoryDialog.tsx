import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@flaner/ui-components";
import { useState } from "react";
import type { BudgetCategoryTree, BudgetCategoryType } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { CategoryPicker } from "../../../CategoryPicker";
import { importCategoryDialogStyles as styles } from "./ImportCategoryDialog.styles";

export type ImportCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The types of the checked rows: one picker per type, since each type has its own tree. */
  types: BudgetCategoryType[];
  categories: BudgetCategoryTree;
  /** Only the types the user picked a category for. */
  onApply: (categoryIds: Partial<Record<BudgetCategoryType, string>>) => void;
};

/** Import preview bulk action: set one category on every checked row (per type). */
export const ImportCategoryDialog = ({ open, onOpenChange, types, categories, onApply }: ImportCategoryDialogProps) => {
  const { t } = usePlanningTranslations();
  const [picked, setPicked] = useState<Partial<Record<BudgetCategoryType, string>>>({});

  // Cleared on close, so the next opening starts empty
  const close = () => {
    setPicked({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t("budget.import.categoryDialog.title")}</DialogTitle>
          <DialogDescription>{t("budget.import.categoryDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className={styles.body}>
          {types.map((type) => (
            <CategoryPicker
              key={type}
              label={t(`budget.import.categoryDialog.${type}`)}
              tree={categories}
              type={type}
              value={picked[type] ?? null}
              onChange={(categoryId) =>
                setPicked((current) => {
                  const { [type]: _previous, ...rest } = current;
                  return categoryId ? { ...rest, [type]: categoryId } : rest;
                })
              }
            />
          ))}
        </div>
        <div className={styles.footer}>
          <Button type="button" variant="outline" onClick={close}>
            {t("budget.actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={Object.keys(picked).length === 0}
            onClick={() => {
              onApply(picked);
              close();
            }}
          >
            {t("budget.import.categoryDialog.apply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
