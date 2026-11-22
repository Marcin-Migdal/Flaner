import { FormCheckbox } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { BudgetOnboardingFormData } from "../../../../utils/schemas";
import { RecoveryKeyDisplay } from "../../../RecoveryKeyDisplay";
import { recoveryKeyStepStyles as styles } from "./RecoveryKeyStep.styles";

export type RecoveryKeyStepProps = {
  /** Formatted recovery key (groups of four separated by dashes). */
  recoveryKey: string;
};

/** Onboarding step 2: the recovery key, shown this one time, with Copy and Download .txt. */
export const RecoveryKeyStep = ({ recoveryKey }: RecoveryKeyStepProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div className={styles.root}>
      <RecoveryKeyDisplay recoveryKey={recoveryKey} />
      <FormCheckbox<BudgetOnboardingFormData>
        name="recoveryKeySaved"
        label={t("budget.onboarding.recoveryKey.confirm")}
      />
    </div>
  );
};
