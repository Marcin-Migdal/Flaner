import { Button, FormCheckbox } from "@flaner/ui-components";
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { BudgetOnboardingFormData } from "../../../../utils/schemas";
import { recoveryKeyStepStyles as styles } from "./RecoveryKeyStep.styles";

const FILE_NAME = "flaner-budget-recovery-key.txt";

export type RecoveryKeyStepProps = {
  /** Formatted recovery key (groups of four separated by dashes). */
  recoveryKey: string;
};

/** Onboarding step 2: the recovery key, shown this one time, with Copy and Download .txt. */
export const RecoveryKeyStep = ({ recoveryKey }: RecoveryKeyStepProps) => {
  const { t } = usePlanningTranslations();
  const [copied, setCopied] = useState(false);

  const copy = () =>
    navigator.clipboard
      .writeText(recoveryKey)
      .then(() => setCopied(true))
      .catch(reportError);

  const download = () => {
    const file = new Blob([t("budget.onboarding.recoveryKey.fileContent", { key: recoveryKey })], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.root}>
      <p className={styles.key} aria-label={recoveryKey} data-testid="budget-recovery-key">
        {recoveryKey.split("-").map((group, index) => (
          <span key={index} className={styles.group} aria-hidden="true">
            {group}
          </span>
        ))}
      </p>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t("budget.onboarding.recoveryKey.copied") : t("budget.onboarding.recoveryKey.copy")}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download aria-hidden="true" />
          {t("budget.onboarding.recoveryKey.download")}
        </Button>
      </div>
      <FormCheckbox<BudgetOnboardingFormData>
        name="recoveryKeySaved"
        label={t("budget.onboarding.recoveryKey.confirm")}
      />
    </div>
  );
};
