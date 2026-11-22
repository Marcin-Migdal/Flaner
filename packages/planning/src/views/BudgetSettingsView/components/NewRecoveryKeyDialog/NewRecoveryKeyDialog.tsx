import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormCheckbox,
  FormTextField,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { unlockWithPassphrase, type UnlockedBudget } from "../../../../api/budget";
import { RecoveryKeyDisplay } from "../../../../components/RecoveryKeyDisplay";
import { useReplaceRecoveryKeyMutation } from "../../../../hooks/api/mutation";
import { useGetLockedBudgetQuery } from "../../../../hooks/api/query";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { generateRecoveryKey } from "../../../../utils/budgetCrypto";
import { getBudgetNewRecoveryKeySchema, type BudgetNewRecoveryKeyFormData } from "../../../../utils/schemas";
import { newRecoveryKeyDialogStyles as styles } from "./NewRecoveryKeyDialog.styles";

export type NewRecoveryKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type NewRecoveryKeyFormProps = {
  onDone: () => void;
  onPendingChange: (isPending: boolean) => void;
};

// Mounted each time the dialog opens, so every opening shows a fresh key: one shown before but never stored is not reused
const NewRecoveryKeyForm = ({ onDone, onPendingChange }: NewRecoveryKeyFormProps) => {
  const { t } = usePlanningTranslations();
  const { data: locked } = useGetLockedBudgetQuery();
  const { mutateAsync: replaceRecoveryKey, isPending } = useReplaceRecoveryKeyMutation({
    onMutate: () => onPendingChange(true),
    onSettled: () => onPendingChange(false),
  });
  const [recoveryKey] = useState(generateRecoveryKey);
  const methods = useForm<BudgetNewRecoveryKeyFormData>({
    resolver: zodResolver(getBudgetNewRecoveryKeySchema(t)),
    defaultValues: { passphrase: "", recoveryKeySaved: false },
  });

  const submit = async ({ passphrase }: BudgetNewRecoveryKeyFormData) => {
    if (!locked) return;
    // A fresh unlock: the key in memory may be a remembered device's copy, which cannot be re-wrapped
    let budget: UnlockedBudget;
    try {
      budget = await unlockWithPassphrase(locked, passphrase);
    } catch {
      methods.setError("passphrase", { message: t("errors.budget.wrongPassphrase") });
      return;
    }
    try {
      await replaceRecoveryKey({ budget, recoveryKey });
      onDone();
    } catch {
      // Handled by the mutation's global error toast
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
        <RecoveryKeyDisplay recoveryKey={recoveryKey} />
        <FormCheckbox<BudgetNewRecoveryKeyFormData>
          name="recoveryKeySaved"
          label={t("budget.onboarding.recoveryKey.confirm")}
        />
        <FormTextField<BudgetNewRecoveryKeyFormData>
          name="passphrase"
          type="password"
          autoComplete="current-password"
          label={t("budget.security.recoveryKey.passphraseLabel")}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            {t("budget.actions.cancel")}
          </Button>
          <Button type="submit" variant="brand" isBusy={isPending || methods.formState.isSubmitting}>
            {t("budget.security.recoveryKey.submit")}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
};

/**
 * New recovery key: shown once, and stored (the old key stops working) only after the user confirms they saved it
 * and enters the passphrase.
 */
export const NewRecoveryKeyDialog = ({ open, onOpenChange }: NewRecoveryKeyDialogProps) => {
  const { t } = usePlanningTranslations();
  const [isPending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("budget.security.recoveryKey.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("budget.security.recoveryKey.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <NewRecoveryKeyForm onDone={() => onOpenChange(false)} onPendingChange={setPending} />
      </DialogContent>
    </Dialog>
  );
};
