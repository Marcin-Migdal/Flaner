import { useAuth } from "@flaner/shared/context";
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
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { unlockWithPassphrase, unlockWithRecoveryKey, type UnlockedBudget } from "../../../../api/budget";
import { NewPassphraseFields } from "../../../../components/NewPassphraseFields";
import { useChangeBudgetPassphraseMutation } from "../../../../hooks/api/mutation";
import { useGetLockedBudgetQuery } from "../../../../hooks/api/query";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetChangePassphraseSchema, type BudgetChangePassphraseFormData } from "../../../../utils/schemas";
import { changePassphraseDialogStyles as styles } from "./ChangePassphraseDialog.styles";

const EMPTY: BudgetChangePassphraseFormData = {
  method: "passphrase",
  current: "",
  passphrase: "",
  passphraseConfirm: "",
};

export type ChangePassphraseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Change passphrase, proven with the current passphrase or the recovery key. Re-wraps the user key only. */
export const ChangePassphraseDialog = ({ open, onOpenChange }: ChangePassphraseDialogProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { data: locked } = useGetLockedBudgetQuery();
  const { mutateAsync: changePassphrase, isPending } = useChangeBudgetPassphraseMutation();
  const methods = useForm<BudgetChangePassphraseFormData>({
    resolver: zodResolver(getBudgetChangePassphraseSchema(t, { email: user?.email, username: user?.username })),
    defaultValues: EMPTY,
  });
  const method = useWatch({ control: methods.control, name: "method" });
  const isRecoveryKey = method === "recoveryKey";

  useEffect(() => {
    if (open) methods.reset(EMPTY);
  }, [open, methods]);

  const toggleMethod = () => {
    methods.setValue("method", isRecoveryKey ? "passphrase" : "recoveryKey");
    methods.resetField("current");
  };

  const submit = async ({ current, passphrase }: BudgetChangePassphraseFormData) => {
    if (!locked) return;
    // A fresh unlock: the key in memory may be a remembered device's copy, which cannot be re-wrapped
    let budget: UnlockedBudget;
    try {
      budget = isRecoveryKey ? await unlockWithRecoveryKey(locked, current) : await unlockWithPassphrase(locked, current);
    } catch {
      const key = isRecoveryKey ? "wrongRecoveryKey" : "wrongPassphrase";
      methods.setError("current", { message: t(`errors.budget.${key}`) });
      return;
    }
    try {
      await changePassphrase({ budget, passphrase });
      onOpenChange(false);
    } catch {
      // Handled by the mutation's global error toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("budget.security.changePassphrase.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("budget.security.changePassphrase.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
            <div className={styles.current}>
              <FormTextField<BudgetChangePassphraseFormData>
                // Remount on switch, so the browser does not offer a saved passphrase for the recovery key
                key={method}
                name="current"
                type={isRecoveryKey ? "text" : "password"}
                autoComplete={isRecoveryKey ? "off" : "current-password"}
                label={t(`budget.security.changePassphrase.current.${method}`)}
              />
              <Button type="button" variant="link" className={styles.switch} onClick={toggleMethod}>
                {t(`budget.security.changePassphrase.switchTo.${isRecoveryKey ? "passphrase" : "recoveryKey"}`)}
              </Button>
            </div>
            <NewPassphraseFields
              label={t("budget.security.changePassphrase.newLabel")}
              confirmLabel={t("budget.security.changePassphrase.confirmLabel")}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending || methods.formState.isSubmitting}>
                {t("budget.security.changePassphrase.submit")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
