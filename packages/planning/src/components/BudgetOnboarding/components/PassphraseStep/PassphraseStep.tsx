import { Alert, AlertDescription, FormTextField, PassphraseStrength } from "@flaner/ui-components";
import { ShieldAlert } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getPassphraseStrength } from "../../../../utils/passphrasePolicy";
import type { BudgetOnboardingFormData } from "../../../../utils/schemas";
import { passphraseStepStyles as styles } from "./PassphraseStep.styles";

/** Onboarding step 1: the budget passphrase, its strength and what losing it means. */
export const PassphraseStep = () => {
  const { t } = usePlanningTranslations();
  const { control } = useFormContext<BudgetOnboardingFormData>();
  const strength = getPassphraseStrength(useWatch({ control, name: "passphrase" }));

  return (
    <div className={styles.root}>
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertDescription>{t("budget.onboarding.passphrase.notFlanerPassword")}</AlertDescription>
      </Alert>
      <FormTextField<BudgetOnboardingFormData>
        name="passphrase"
        type="password"
        autoComplete="new-password"
        label={t("budget.onboarding.passphrase.label")}
        description={t("budget.onboarding.passphrase.hint")}
      />
      <PassphraseStrength strength={strength} label={t(`budget.onboarding.passphrase.strength.level${strength}`)} />
      <FormTextField<BudgetOnboardingFormData>
        name="passphraseConfirm"
        type="password"
        autoComplete="new-password"
        label={t("budget.onboarding.passphrase.confirmLabel")}
      />
    </div>
  );
};
