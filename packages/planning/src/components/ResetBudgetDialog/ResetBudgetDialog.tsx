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
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useBudgetSession } from "../../context/BudgetContext";
import { useResetBudgetMutation } from "../../hooks/api/mutation";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getBudgetResetSchema, type BudgetResetFormData } from "../../utils/schemas";
import { resetBudgetDialogStyles as styles } from "./ResetBudgetDialog.styles";

export type ResetBudgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Reset budget: the user types RESET / RESETUJ; every budget document goes and the Budget shows onboarding. */
export const ResetBudgetDialog = ({ open, onOpenChange }: ResetBudgetDialogProps) => {
  const { t } = usePlanningTranslations();
  const { setBudget } = useBudgetSession();
  const { mutateAsync: resetBudget, isPending } = useResetBudgetMutation();
  const confirmationWord = t("budget.security.reset.confirmationWord");

  const methods = useForm<BudgetResetFormData>({
    resolver: zodResolver(getBudgetResetSchema(t, confirmationWord)),
    defaultValues: { confirmation: "" },
  });

  useEffect(() => {
    if (open) methods.reset({ confirmation: "" });
  }, [open, methods]);

  const submit = async () => {
    try {
      await resetBudget();
      onOpenChange(false);
      setBudget(null);
    } catch {
      // Handled by the mutation's global error toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("budget.security.reset.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("budget.security.reset.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
            <FormTextField<BudgetResetFormData>
              name="confirmation"
              autoComplete="off"
              label={t("budget.security.reset.confirmationLabel", { word: confirmationWord })}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.actions.cancel")}
              </Button>
              <Button type="submit" variant="destructive" isBusy={isPending}>
                {t("budget.security.reset.submit")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
