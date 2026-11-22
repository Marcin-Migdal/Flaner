import { Button, FormCheckbox, FormTextField } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { unlockWithRecoveryKey, type LockedBudget, type UnlockedBudget } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetRecoveryUnlockSchema, type BudgetRecoveryUnlockFormData } from "../../../../utils/schemas";
import { recoveryKeyUnlockFormStyles as styles } from "./RecoveryKeyUnlockForm.styles";

export type RecoveryKeyUnlockFormProps = {
  locked: LockedBudget;
  onUnlock: (budget: UnlockedBudget, remember: boolean) => void;
  onUsePassphrase: () => void;
  /** Lost both secrets: Reset budget is the only way left. */
  onReset: () => void;
};

export const RecoveryKeyUnlockForm = ({ locked, onUnlock, onUsePassphrase, onReset }: RecoveryKeyUnlockFormProps) => {
  const { t } = usePlanningTranslations();
  const methods = useForm<BudgetRecoveryUnlockFormData>({
    resolver: zodResolver(getBudgetRecoveryUnlockSchema(t)),
    defaultValues: { recoveryKey: "", remember: true },
  });

  const submit = async ({ recoveryKey, remember }: BudgetRecoveryUnlockFormData) => {
    try {
      onUnlock(await unlockWithRecoveryKey(locked, recoveryKey), remember);
    } catch {
      methods.setError("recoveryKey", { message: t("errors.budget.wrongRecoveryKey") });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
        <FormTextField<BudgetRecoveryUnlockFormData>
          name="recoveryKey"
          autoComplete="off"
          spellCheck={false}
          className={styles.key}
          label={t("budget.unlock.recovery.label")}
          description={t("budget.unlock.recovery.hint")}
        />
        <FormCheckbox<BudgetRecoveryUnlockFormData>
          name="remember"
          label={t("budget.unlock.remember")}
          description={t("budget.unlock.rememberHint")}
        />
        <Button type="submit" variant="brand" className={styles.submit} isBusy={methods.formState.isSubmitting}>
          {t("budget.unlock.submit")}
        </Button>
        <Button type="button" variant="link" className={styles.link} onClick={onUsePassphrase}>
          {t("budget.unlock.recovery.usePassphrase")}
        </Button>
        <p className={styles.lostBoth}>
          {t("budget.unlock.recovery.lostBoth")}{" "}
          <Button type="button" variant="link" className={styles.resetLink} onClick={onReset}>
            {t("budget.security.reset.action")}
          </Button>
        </p>
      </form>
    </FormProvider>
  );
};
