import { useCurrencyOptions } from "@flaner/shared/hooks";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormSelect,
  FormTextField,
  Select,
  type SelectOption,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { BudgetAccount } from "../../../../api/budget";
import { useAddBudgetAccountMutation, useUpdateBudgetAccountMutation } from "../../../../hooks/api/mutation";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetAccountSchema, type BudgetAccountFormData } from "../../../../utils/schemas";
import { budgetAccountDialogStyles as styles } from "./BudgetAccountDialog.styles";

const showCode = (option: SelectOption, { context }: { context: string }) =>
  context === "value" ? option.value : option.label;

export type BudgetAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account to edit; adds a new one when missing. */
  account?: BudgetAccount;
  /** New accounts start in this currency. */
  defaultCurrency: string;
  /** The account has transactions: its currency is shown, not editable. */
  currencyLocked?: boolean;
  saveDisabled?: boolean;
};

/** Add account / Edit account (rename, and change the currency while the account has no transactions). */
export const BudgetAccountDialog = ({
  open,
  onOpenChange,
  account,
  defaultCurrency,
  currencyLocked = false,
  saveDisabled,
}: BudgetAccountDialogProps) => {
  const { t } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const showWriteError = useBudgetWriteErrorToast();
  const { mutateAsync: addAccount, isPending: isAdding } = useAddBudgetAccountMutation();
  const { mutateAsync: updateAccount, isPending: isUpdating } = useUpdateBudgetAccountMutation();
  const isPending = isAdding || isUpdating;
  const mode = account ? "edit" : "add";

  const methods = useForm<BudgetAccountFormData>({
    resolver: zodResolver(getBudgetAccountSchema(t)),
    defaultValues: { name: "", defaultCurrency },
  });
  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (open) reset({ name: account?.name ?? "", defaultCurrency: account?.defaultCurrency ?? defaultCurrency });
  }, [open, account, defaultCurrency, reset]);

  const onSubmit = async (data: BudgetAccountFormData) => {
    try {
      if (account) {
        await updateAccount({
          accountId: account.id,
          changes: {
            ...(data.name !== account.name && { name: data.name }),
            ...(!currencyLocked && data.defaultCurrency !== account.defaultCurrency && {
              defaultCurrency: data.defaultCurrency,
            }),
          },
        });
      } else {
        await addAccount(data);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void handleSubmit(onSubmit)(), fallbackKey: "toasts.budget.accountSaveError" });
      }
    }
  };

  const currencyLabel = t("budget.accounts.form.currency");

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t(`budget.accounts.form.${mode}Title`)}</DialogTitle>
          <DialogDescription>{t(`budget.accounts.form.${mode}Description`)}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
            <FormTextField<BudgetAccountFormData>
              name="name"
              label={t("budget.accounts.form.name")}
              placeholder={t("budget.onboarding.account.namePlaceholder")}
              autoComplete="off"
            />
            {currencyLocked && account ? (
              // Not `FormSelect disabled`: react-hook-form would drop a disabled field's value on submit
              <Select
                label={currencyLabel}
                description={t("budget.accounts.form.currencyLocked")}
                options={currencyOptions}
                value={currencyOptions.find(({ value }) => value === account.defaultCurrency) ?? null}
                formatOptionLabel={showCode}
                disabled
              />
            ) : (
              <FormSelect<BudgetAccountFormData>
                name="defaultCurrency"
                label={currencyLabel}
                options={currencyOptions}
                formatOptionLabel={showCode}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled}>
                {t(`budget.accounts.form.${mode}Submit`)}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
