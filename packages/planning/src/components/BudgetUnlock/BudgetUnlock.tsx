import { Button, Card, FormTextField } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { unlockWithPassphrase, type LockedBudget, type UnlockedBudget } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getBudgetUnlockSchema, type BudgetUnlockFormData } from "../../utils/schemas";
import { budgetUnlockStyles as styles } from "./BudgetUnlock.styles";

export type BudgetUnlockProps = {
  locked: LockedBudget;
  onUnlock: (budget: UnlockedBudget) => void;
};

/** Unlock with the budget passphrase (remember device and the recovery-key path: #170). */
export const BudgetUnlock = ({ locked, onUnlock }: BudgetUnlockProps) => {
  const { t } = usePlanningTranslations();
  const methods = useForm<BudgetUnlockFormData>({
    resolver: zodResolver(getBudgetUnlockSchema(t)),
    defaultValues: { passphrase: "" },
  });

  // Local crypto only (no Firestore write), so no mutation: a wrong passphrase is a field error, not a toast
  const submit = async ({ passphrase }: BudgetUnlockFormData) => {
    try {
      onUnlock(await unlockWithPassphrase(locked, passphrase));
    } catch {
      // The passphrase key failed to unwrap the user key
      methods.setError("passphrase", { message: t("errors.budget.wrongPassphrase") });
    }
  };

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("budget.unlock.title")}</h1>
          <p className={styles.description}>{t("budget.unlock.description")}</p>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
            <FormTextField<BudgetUnlockFormData>
              name="passphrase"
              type="password"
              autoComplete="current-password"
              label={t("budget.unlock.label")}
            />
            <Button type="submit" variant="brand" className={styles.submit} isBusy={methods.formState.isSubmitting}>
              {t("budget.unlock.submit")}
            </Button>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};
