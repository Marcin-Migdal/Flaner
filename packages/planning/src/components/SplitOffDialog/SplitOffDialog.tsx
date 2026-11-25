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
  FormTextField,
  MoneyInput,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useController, useForm, useWatch } from "react-hook-form";
import type { BudgetCategoryTree, BudgetSplitOff, BudgetTransaction } from "../../api/budget";
import { useAddBudgetSplitOffMutation, useUpdateBudgetSplitOffMutation } from "../../hooks/api/mutation";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getBudgetSplitOffSchema, type BudgetSplitOffFormData } from "../../utils/schemas";
import { splitRest } from "../../utils/splitOffs";
import { CategoryPicker } from "../CategoryPicker";
import { splitOffDialogStyles as styles } from "./SplitOffDialog.styles";

export type SplitOffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: BudgetTransaction;
  /** Edits this split-off instead of adding one; a refund split-off keeps its amount. */
  splitOff?: BudgetSplitOff | null;
  categories: BudgetCategoryTree;
  /** Disables saving (e.g. offline). */
  saveDisabled?: boolean;
};

const defaultValues = (splitOff?: BudgetSplitOff | null): Partial<BudgetSplitOffFormData> => ({
  amount: splitOff ? fromMinorUnits(splitOff.amount) : undefined,
  categoryId: splitOff?.categoryId ?? null,
  note: splitOff?.note ?? "",
});

/** Split off part of a transaction (own amount, category and note), or edit a split-off. */
export const SplitOffDialog = ({
  open,
  onOpenChange,
  transaction,
  splitOff,
  categories,
  saveDisabled,
}: SplitOffDialogProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const showWriteError = useBudgetWriteErrorToast();
  const { mutateAsync: addSplitOff, isPending: isAdding } = useAddBudgetSplitOffMutation();
  const { mutateAsync: updateSplitOff, isPending: isUpdating } = useUpdateBudgetSplitOffMutation();
  const isPending = isAdding || isUpdating;
  const isAmountLocked = !!splitOff?.refund;

  // What this split-off may take: the rest, plus its own amount when editing
  const room = splitRest(transaction) + (splitOff?.amount ?? 0);

  const methods = useForm<BudgetSplitOffFormData>({
    resolver: zodResolver(getBudgetSplitOffSchema(t, room)),
    defaultValues: defaultValues(splitOff),
  });
  const { control, reset, handleSubmit } = methods;
  const { field: categoryField } = useController({ control, name: "categoryId" });
  const amount = useWatch({ control, name: "amount" });

  useEffect(() => {
    if (open) reset(defaultValues(splitOff));
  }, [open, splitOff, reset]);

  const onSubmit = async (data: BudgetSplitOffFormData) => {
    const input = { amount: toMinorUnits(data.amount), categoryId: data.categoryId, note: data.note.trim() };
    try {
      if (splitOff) await updateSplitOff({ ref: transaction, splitOffId: splitOff.id, patch: input });
      else await addSplitOff({ ref: transaction, input });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void handleSubmit(onSubmit)(), fallbackKey: "toasts.budget.saveError" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t(splitOff ? "budget.splitOff.editTitle" : "budget.splitOff.title")}</DialogTitle>
          <DialogDescription>
            {t("budget.splitOff.description", {
              payee: transaction.payee,
              amount: format(transaction.amount, transaction.currency),
            })}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              {/* Read-only, not a `disabled` form field: react-hook-form would drop its value on submit */}
              {isAmountLocked ? (
                <MoneyInput
                  label={t("budget.splitOff.amount")}
                  currencyLabel={t("budget.transactionForm.currency")}
                  currency={transaction.currency}
                  value={amount ?? ""}
                  readOnly
                  disabled
                  currencyDisabled
                  description={t("budget.splitOff.amountLocked")}
                />
              ) : (
                <FormMoneyInput
                  amountName="amount"
                  label={t("budget.splitOff.amount")}
                  currencyLabel={t("budget.transactionForm.currency")}
                  currency={transaction.currency}
                  currencyDisabled
                  description={t("budget.splitOff.room", { amount: format(room, transaction.currency) })}
                />
              )}
              <CategoryPicker
                label={t("budget.splitOff.category")}
                tree={categories}
                type={transaction.type}
                value={categoryField.value}
                onChange={categoryField.onChange}
              />
              <FormTextField
                name="note"
                label={t("budget.splitOff.note")}
                description={t("budget.transactionForm.optional")}
                autoComplete="off"
              />
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.transactionForm.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled}>
                {t(splitOff ? "budget.splitOff.saveEdit" : "budget.splitOff.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
