import { Button, FormCheckbox, FormTextField } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { unlockWithPassphrase, type LockedBudget, type UnlockedBudget } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetUnlockSchema, type BudgetUnlockFormData } from "../../../../utils/schemas";
import { passphraseUnlockFormStyles as styles } from "./PassphraseUnlockForm.styles";

export type PassphraseUnlockFormProps = {
  locked: LockedBudget;
  onUnlock: (budget: UnlockedBudget, remember: boolean) => Promise<void>;
  onUseRecoveryKey: () => void;
};

export const PassphraseUnlockForm = ({ locked, onUnlock, onUseRecoveryKey }: PassphraseUnlockFormProps) => {
  const { t } = usePlanningTranslations();
  const methods = useForm<BudgetUnlockFormData>({
    resolver: zodResolver(getBudgetUnlockSchema(t)),
    defaultValues: { passphrase: "", remember: true },
  });

  // Local crypto only (no Firestore write), so no mutation: a wrong passphrase is a field error, not a toast
  const submit = async ({ passphrase, remember }: BudgetUnlockFormData) => {
    let budget: UnlockedBudget;
    try {
      budget = await unlockWithPassphrase(locked, passphrase);
    } catch {
      methods.setError("passphrase", { message: t("errors.budget.wrongPassphrase") });
      return;
    }
    await onUnlock(budget, remember);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
        <FormTextField<BudgetUnlockFormData>
          name="passphrase"
          type="password"
          autoComplete="current-password"
          label={t("budget.unlock.label")}
        />
        <FormCheckbox<BudgetUnlockFormData>
          name="remember"
          label={t("budget.unlock.remember")}
          description={t("budget.unlock.rememberHint")}
        />
        <Button type="submit" variant="brand" className={styles.submit} isBusy={methods.formState.isSubmitting}>
          {t("budget.unlock.submit")}
        </Button>
        <Button type="button" variant="link" className={styles.switch} onClick={onUseRecoveryKey}>
          {t("budget.unlock.useRecoveryKey")}
        </Button>
      </form>
    </FormProvider>
  );
};
