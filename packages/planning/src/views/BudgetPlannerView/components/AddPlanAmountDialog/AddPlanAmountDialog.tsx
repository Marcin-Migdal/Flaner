import { useMoneyFormatter } from "@flaner/shared/hooks";
import { fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FormMoneyInput,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useController, useForm, type DefaultValues } from "react-hook-form";
import type { BudgetCategoryTree, BudgetCategoryType } from "../../../../api/budget";
import { CategoryPicker } from "../../../../components/CategoryPicker";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetPlanAmountSchema, type BudgetPlanAmountFormData } from "../../../../utils/schemas";
import { addPlanAmountDialogStyles as styles } from "./AddPlanAmountDialog.styles";

/** What the dialog opens with: empty from the section header, preset from Outside the plan. */
export type AddPlanAmountPreset = {
  type: BudgetCategoryType;
  categoryId: string | null;
  /** The amount's default, in minor units: from Outside the plan, the higher of spent and expected recurring. */
  amount: number | null;
  /** Spent (or received) so far, in minor units, shown under the amount; none when left out. */
  spent?: number;
};

export type AddPlanAmountDialogProps = {
  /** `null`: closed. */
  preset: AddPlanAmountPreset | null;
  onClose: () => void;
  categories: BudgetCategoryTree;
  mainCurrency: string;
  /** The month's label (e.g. "November 2026"). */
  monthLabel: string;
  /** Saves the amount (minor units) of the preset's type; rejects to keep the dialog open. */
  onSave: (type: BudgetCategoryType, categoryId: string, amount: number) => Promise<void>;
  isSaving?: boolean;
  saveDisabled?: boolean;
};

const defaultValues = (preset: AddPlanAmountPreset | null): DefaultValues<BudgetPlanAmountFormData> => ({
  categoryId: preset?.categoryId ?? undefined,
  amount: preset?.amount ? fromMinorUnits(preset.amount) : undefined,
});

/** Add limit (expenses) / Add planned income: a category or subcategory and an amount in the main currency. */
export const AddPlanAmountDialog = ({
  preset,
  onClose,
  categories,
  mainCurrency,
  monthLabel,
  onSave,
  isSaving,
  saveDisabled,
}: AddPlanAmountDialogProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const isExpense = preset?.type !== "income";
  const soFar = preset?.spent
    ? t(isExpense ? "budget.planner.dialog.spentHint" : "budget.planner.dialog.receivedHint", {
        amount: format(preset.spent, mainCurrency),
      })
    : undefined;

  const methods = useForm<BudgetPlanAmountFormData>({
    resolver: zodResolver(getBudgetPlanAmountSchema(t)),
    defaultValues: defaultValues(preset),
  });
  const { control, reset, handleSubmit } = methods;
  useEffect(() => {
    if (preset) reset(defaultValues(preset));
  }, [preset, reset]);
  const { field: categoryField, fieldState: categoryState } = useController({ control, name: "categoryId" });

  const onSubmit = async ({ categoryId, amount }: BudgetPlanAmountFormData) => {
    if (!preset) return;
    try {
      await onSave(preset.type, categoryId, toMinorUnits(amount));
      onClose();
    } catch {
      // The caller shows the error toast; the dialog stays open for another try
    }
  };

  return (
    <Dialog open={preset !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t(isExpense ? "budget.planner.dialog.limitTitle" : "budget.planner.dialog.incomeTitle")}</DialogTitle>
          <DialogDescription>{t("budget.planner.dialog.description", { month: monthLabel })}</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              <CategoryPicker
                label={t("budget.planner.dialog.category")}
                tree={categories}
                type={preset?.type ?? "expense"}
                value={categoryField.value ?? null}
                onChange={(categoryId) => categoryField.onChange(categoryId ?? "")}
                error={categoryState.error?.message}
              />
              <FormMoneyInput
                name="amount"
                label={t(isExpense ? "budget.planner.dialog.limit" : "budget.planner.dialog.plannedIncome")}
                description={soFar}
                currency={mainCurrency}
                currencyDisabled
              />
            </div>
            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                {t("budget.planner.dialog.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isSaving} disabled={saveDisabled}>
                {t("budget.planner.dialog.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
