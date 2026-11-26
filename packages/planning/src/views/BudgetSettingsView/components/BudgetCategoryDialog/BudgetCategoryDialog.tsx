import { cn } from "@flaner/shared/utils";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormTextField,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useController, useForm, useWatch } from "react-hook-form";
import {
  BUDGET_CATEGORY_ICONS,
  type BudgetCategory,
  type BudgetCategoryType,
  type BudgetSubcategory,
  type ChartColorIndex,
} from "../../../../api/budget";
import { useUpdateBudgetCategoriesMutation } from "../../../../hooks/api/mutation";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import { addCategory, addSubcategory, updateCategory } from "../../../../utils/categoryTree";
import { getBudgetCategorySchema, type BudgetCategoryFormData } from "../../../../utils/schemas";
import { budgetCategoryDialogStyles as styles } from "./BudgetCategoryDialog.styles";

const COLORS: ChartColorIndex[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** What the dialog adds or edits: a main category (`parent` `null`) or a subcategory of `parent`. */
export type BudgetCategoryDialogTarget = {
  type: BudgetCategoryType;
  parent: BudgetCategory | null;
  /** The category or subcategory edited; adds a new one when `null`. */
  editing: BudgetCategory | BudgetSubcategory | null;
};

export type BudgetCategoryDialogProps = {
  /** Open while set. */
  target: BudgetCategoryDialogTarget | null;
  onClose: () => void;
  saveDisabled?: boolean;
};

const IconGrid = () => {
  const { t } = usePlanningTranslations();
  const { field } = useController<BudgetCategoryFormData, "icon">({ name: "icon" });
  const color = useWatch<BudgetCategoryFormData, "color">({ name: "color" });

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{t("budget.categories.form.icon")}</legend>
      <div className={styles.iconGrid}>
        {BUDGET_CATEGORY_ICONS.map((icon) => {
          const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[icon];
          return (
            <label key={icon} className={styles.choice} title={t(`budget.categories.icons.${icon}`)}>
              <input
                type="radio"
                name={field.name}
                value={icon}
                checked={field.value === icon}
                onChange={() => field.onChange(icon)}
                className={styles.radio}
                aria-label={t(`budget.categories.icons.${icon}`)}
              />
              <span className={cn(styles.iconTile, BUDGET_CATEGORY_COLOR_CLASSES[color])}>
                <Icon aria-hidden="true" />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

const ColorSwatches = () => {
  const { t } = usePlanningTranslations();
  const { field } = useController<BudgetCategoryFormData, "color">({ name: "color" });

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{t("budget.categories.form.color")}</legend>
      <div className={styles.swatches}>
        {COLORS.map((color) => (
          <label key={color} className={styles.choice} title={t("budget.categories.form.colorOption", { index: color })}>
            <input
              type="radio"
              name={field.name}
              value={color}
              checked={field.value === color}
              onChange={() => field.onChange(color)}
              className={styles.radio}
              aria-label={t("budget.categories.form.colorOption", { index: color })}
            />
            <span className={cn(styles.swatch, BUDGET_CATEGORY_COLOR_CLASSES[color])}>
              {field.value === color && <Check aria-hidden="true" className={styles.swatchCheck} />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

const Preview = () => {
  const { t } = usePlanningTranslations();
  const [name, icon, color] = useWatch<BudgetCategoryFormData, ["name", "icon", "color"]>({
    name: ["name", "icon", "color"],
  });
  const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[icon];

  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>{t("budget.categories.form.preview")}</span>
      <span className={styles.previewRow}>
        <span className={cn(styles.tile, BUDGET_CATEGORY_COLOR_CLASSES[color])}>
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.previewName}>{name.trim() || t("budget.categories.form.namePlaceholder")}</span>
      </span>
    </div>
  );
};

/**
 * Add / edit a category: name, icon from the curated list, one of the 8 chart colours and a preview row. A
 * subcategory takes only a name (it uses its parent's icon and colour).
 */
export const BudgetCategoryDialog = ({ target, onClose, saveDisabled }: BudgetCategoryDialogProps) => {
  const { t } = usePlanningTranslations();
  const showWriteError = useBudgetWriteErrorToast();
  const { mutateAsync: updateCategories, isPending } = useUpdateBudgetCategoriesMutation();

  const methods = useForm<BudgetCategoryFormData>({
    resolver: zodResolver(getBudgetCategorySchema(t)),
    defaultValues: { name: "", icon: "tag", color: 1 },
  });
  const { reset, handleSubmit } = methods;

  // The main category's own look, a subcategory's parent's, or the defaults for a new one
  const look = target?.parent ?? (target?.editing && "icon" in target.editing ? target.editing : null);
  useEffect(() => {
    if (target) reset({ name: target.editing?.name ?? "", icon: look?.icon ?? "tag", color: look?.color ?? 1 });
  }, [target, look, reset]);

  const isSub = target?.parent != null;
  const isEdit = target?.editing != null;

  const onSubmit = async ({ name, icon, color }: BudgetCategoryFormData) => {
    if (!target) return;
    const { type, parent, editing } = target;
    try {
      await updateCategories((tree) => {
        if (editing) return updateCategory(tree, { type, categoryId: editing.id }, parent ? { name } : { name, icon, color });
        if (parent) return addSubcategory(tree, { type, categoryId: parent.id }, { id: crypto.randomUUID(), name });
        return addCategory(tree, type, { id: crypto.randomUUID(), name, icon, color });
      });
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void handleSubmit(onSubmit)(), fallbackKey: "toasts.budget.categorySaveError" });
      }
    }
  };

  const title = () => {
    if (isEdit) return t(isSub ? "budget.categories.form.editSubTitle" : "budget.categories.form.editTitle");
    return isSub
      ? t("budget.categories.form.addSubTitle", { parent: target?.parent?.name })
      : t("budget.categories.form.addTitle");
  };

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title()}</DialogTitle>
          <DialogDescription>
            {t(isSub ? "budget.categories.form.subDescription" : "budget.categories.form.description")}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
            <FormTextField<BudgetCategoryFormData>
              name="name"
              label={t("budget.categories.form.name")}
              placeholder={t("budget.categories.form.namePlaceholder")}
              autoComplete="off"
            />
            {!isSub && (
              <>
                <IconGrid />
                <ColorSwatches />
              </>
            )}
            <Preview />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {t("budget.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled}>
                {t(isEdit ? "budget.categories.form.editSubmit" : "budget.categories.form.addSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
