import { Alert, AlertDescription } from "@flaner/ui-components";
import { ShieldAlert } from "lucide-react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { NewPassphraseFields } from "../../../NewPassphraseFields";
import { passphraseStepStyles as styles } from "./PassphraseStep.styles";

/** Onboarding step 1: the budget passphrase, its strength and what losing it means. */
export const PassphraseStep = () => {
  const { t } = usePlanningTranslations();

  return (
    <div className={styles.root}>
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertDescription>{t("budget.onboarding.passphrase.notFlanerPassword")}</AlertDescription>
      </Alert>
      <NewPassphraseFields
        label={t("budget.onboarding.passphrase.label")}
        confirmLabel={t("budget.onboarding.passphrase.confirmLabel")}
      />
    </div>
  );
};
