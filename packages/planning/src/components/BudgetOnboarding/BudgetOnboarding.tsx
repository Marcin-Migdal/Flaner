import { useAuth } from "@flaner/shared/context";
import { useCurrencyOptions } from "@flaner/shared/hooks";
import {
  Button,
  Card,
  FormSelect,
  FormTextField,
  Stepper,
  type SelectOption,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type FormEvent } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { UnlockedBudget } from "../../api/budget";
import { useCreateBudgetMutation } from "../../hooks/api/mutation";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { generateRecoveryKey } from "../../utils/budgetCrypto";
import { buildDefaultCategoryTree } from "../../utils/defaultBudgetCategories";
import { getLocaleCurrency } from "../../utils/localeCurrency";
import {
  BUDGET_ONBOARDING_STEP_FIELDS,
  getBudgetOnboardingSchema,
  type BudgetOnboardingFormData,
} from "../../utils/schemas";
import { budgetOnboardingStyles as styles } from "./BudgetOnboarding.styles";
import { PassphraseStep } from "./components/PassphraseStep";
import { RecoveryKeyStep } from "./components/RecoveryKeyStep";

const STEPS = ["passphrase", "recoveryKey", "currency", "account"] as const;

const showCode = (option: SelectOption, { context }: { context: string }) =>
  context === "value" ? option.value : option.label;

export type BudgetOnboardingProps = {
  /** Called with the unlocked budget once everything is stored. */
  onComplete: (budget: UnlockedBudget) => void;
};

/** First visit to the Budget: passphrase → recovery key → main currency → main account, stored in one go at the end. */
export const BudgetOnboarding = ({ onComplete }: BudgetOnboardingProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const currencyOptions = useCurrencyOptions();
  const { mutateAsync: createBudget, isPending } = useCreateBudgetMutation();
  // Generated once per onboarding and shown only here; nothing is stored until the last step
  const [recoveryKey] = useState(generateRecoveryKey);
  const [localeCurrency] = useState(() => getLocaleCurrency(navigator.language));
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;

  const methods = useForm<BudgetOnboardingFormData>({
    resolver: zodResolver(getBudgetOnboardingSchema(t, { email: user?.email, username: user?.username })),
    defaultValues: {
      passphrase: "",
      passphraseConfirm: "",
      recoveryKeySaved: false,
      mainCurrency: localeCurrency,
      accountName: "",
      accountCurrency: localeCurrency,
    },
  });

  const goNext = async () => {
    if (!(await methods.trigger([...BUDGET_ONBOARDING_STEP_FIELDS[step]]))) return;
    // The main account starts in the main currency unless the user already picked another one
    if (STEPS[step] === "currency" && !methods.getFieldState("accountCurrency").isDirty) {
      methods.setValue("accountCurrency", methods.getValues("mainCurrency"));
    }
    setStep(step + 1);
  };

  const finish = async (data: BudgetOnboardingFormData) => {
    try {
      const budget = await createBudget({
        passphrase: data.passphrase,
        recoveryKey,
        mainCurrency: data.mainCurrency,
        mainAccount: { name: data.accountName, currency: data.accountCurrency },
        categories: buildDefaultCategoryTree(t),
      });
      onComplete(budget);
    } catch {
      // Handled by the mutation's global error toast
    }
  };

  // Enter on an earlier step moves on instead of submitting the whole form
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isLastStep) return methods.handleSubmit(finish)(event);
    event.preventDefault();
    return goNext();
  };

  const stepKey = STEPS[step];

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("budget.onboarding.title")}</h1>
          <p className={styles.intro}>{t("budget.onboarding.intro")}</p>
        </div>

        <Stepper
          steps={STEPS.map((id) => ({ id, label: t(`budget.onboarding.steps.${id}`) }))}
          currentStep={step}
        />

        <FormProvider {...methods}>
          <form onSubmit={onSubmit} noValidate className={styles.step}>
            <h2 className={styles.stepTitle}>{t(`budget.onboarding.${stepKey}.title`)}</h2>
            {stepKey !== "passphrase" && (
              <p className={styles.stepDescription}>{t(`budget.onboarding.${stepKey}.description`)}</p>
            )}

            {stepKey === "passphrase" && <PassphraseStep />}
            {stepKey === "recoveryKey" && <RecoveryKeyStep recoveryKey={recoveryKey} />}
            {stepKey === "currency" && (
              <FormSelect<BudgetOnboardingFormData>
                name="mainCurrency"
                label={t("budget.onboarding.currency.label")}
                options={currencyOptions}
                formatOptionLabel={showCode}
              />
            )}
            {stepKey === "account" && (
              <>
                <FormTextField<BudgetOnboardingFormData>
                  name="accountName"
                  label={t("budget.onboarding.account.nameLabel")}
                  placeholder={t("budget.onboarding.account.namePlaceholder")}
                />
                <FormSelect<BudgetOnboardingFormData>
                  name="accountCurrency"
                  label={t("budget.onboarding.account.currencyLabel")}
                  options={currencyOptions}
                  formatOptionLabel={showCode}
                />
              </>
            )}

            <div className={styles.footer}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 0 || isPending}
              >
                {t("budget.onboarding.actions.back")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending}>
                {isLastStep ? t("budget.onboarding.actions.finish") : t("budget.onboarding.actions.next")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};
