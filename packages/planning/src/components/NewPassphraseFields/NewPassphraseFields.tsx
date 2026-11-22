import { FormTextField, PassphraseStrength } from "@flaner/ui-components";
import { useFormContext, useWatch } from "react-hook-form";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getPassphraseStrength } from "../../utils/passphrasePolicy";
import type { BudgetNewPassphraseFormData } from "../../utils/schemas";
import { newPassphraseFieldsStyles as styles } from "./NewPassphraseFields.styles";

export type NewPassphraseFieldsProps = {
  label: string;
  confirmLabel: string;
};

/** A new budget passphrase with its strength and repetition, for any form with `passphrase` / `passphraseConfirm`. */
export const NewPassphraseFields = ({ label, confirmLabel }: NewPassphraseFieldsProps) => {
  const { t } = usePlanningTranslations();
  const { control } = useFormContext<BudgetNewPassphraseFormData>();
  const strength = getPassphraseStrength(useWatch({ control, name: "passphrase" }));

  return (
    <div className={styles.root}>
      <FormTextField<BudgetNewPassphraseFormData>
        name="passphrase"
        type="password"
        autoComplete="new-password"
        label={label}
        description={t("budget.onboarding.passphrase.hint")}
      />
      <PassphraseStrength strength={strength} label={t(`budget.onboarding.passphrase.strength.level${strength}`)} />
      <FormTextField<BudgetNewPassphraseFormData>
        name="passphraseConfirm"
        type="password"
        autoComplete="new-password"
        label={confirmLabel}
      />
    </div>
  );
};
