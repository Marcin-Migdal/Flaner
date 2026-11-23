import { fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, FormMoneyInput } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import type { BudgetCategoryTree, BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getImportRowSchema, type ImportRowFormData } from "../../../../utils/schemas";
import { CategoryPicker } from "../../../CategoryPicker";
import { importRowDialogStyles as styles } from "./ImportRowDialog.styles";

export type ImportRowDialogProps = {
  /** The preview row being edited; `null` closes the dialog. */
  transaction: BudgetTransaction | null;
  categories: BudgetCategoryTree;
  onClose: () => void;
  /** `amount` in minor units. */
  onSave: (changes: { amount: number; categoryId: string | null }) => void;
};

/** Import preview: edit one row's amount and category (the dedup hash stays as read from the file). */
export const ImportRowDialog = ({ transaction, categories, onClose, onSave }: ImportRowDialogProps) => {
  const { t } = usePlanningTranslations();
  const methods = useForm<ImportRowFormData>({ resolver: zodResolver(getImportRowSchema(t)) });
  const { field: categoryField } = useController({ control: methods.control, name: "categoryId" });

  useEffect(() => {
    if (!transaction) return;
    methods.reset({
      amount: fromMinorUnits(transaction.amount),
      currency: transaction.currency,
      categoryId: transaction.categoryId,
    });
  }, [transaction, methods]);

  const onSubmit = (data: ImportRowFormData) => {
    onSave({ amount: toMinorUnits(data.amount), categoryId: data.categoryId });
    onClose();
  };

  return (
    <Dialog open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t("budget.import.rowDialog.title")}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              <p className={styles.payee}>{transaction?.payee}</p>
              <FormMoneyInput
                amountName="amount"
                currencyName="currency"
                label={t("budget.transactionForm.amount")}
                currencyLabel={t("budget.transactionForm.currency")}
                currencyDisabled
              />
              {transaction && (
                <CategoryPicker
                  label={t("budget.transactionForm.category")}
                  tree={categories}
                  type={transaction.type}
                  value={categoryField.value}
                  onChange={categoryField.onChange}
                />
              )}
            </div>
            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("budget.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand">
                {t("budget.import.rowDialog.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
