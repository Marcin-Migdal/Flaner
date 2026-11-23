import { useCurrencyOptions } from "@flaner/shared/hooks";
import { Button, FormSelect, Select } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { useMemo } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import type { BudgetAccount } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { STATEMENT_BANKS } from "../../../../utils/statementImport";
import { getImportSettingsSchema, type ImportSettingsFormData } from "../../../../utils/schemas";
import type { ImportFile } from "../../types";
import { importSettingsStepStyles as styles } from "./ImportSettingsStep.styles";

export type ImportSettingsStepProps = {
  file: ImportFile;
  accounts: BudgetAccount[];
  defaultValues: Partial<ImportSettingsFormData>;
  /** The preview is being built. */
  isBusy: boolean;
  /** Why the preview could not be built. */
  error: string | null;
  onBack: () => void;
  onSubmit: (settings: ImportSettingsFormData) => void;
};

/** Import wizard, Settings step: bank (detected from the header, can be changed), account and fallback currency. */
export const ImportSettingsStep = ({
  file,
  accounts,
  defaultValues,
  isBusy,
  error,
  onBack,
  onSubmit,
}: ImportSettingsStepProps) => {
  const { t } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const methods = useForm<ImportSettingsFormData>({
    resolver: zodResolver(getImportSettingsSchema(t)),
    defaultValues,
  });

  const { field: accountField, fieldState: accountState } = useController({ control: methods.control, name: "accountId" });

  const bankOptions = useMemo(
    () => STATEMENT_BANKS.map((bank) => ({ value: bank, label: t(`budget.import.banks.${bank}`) })),
    [t],
  );
  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  return (
    <FormProvider {...methods}>
      <form className={styles.form} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        <p className={styles.file}>
          <FileText aria-hidden="true" />
          <span className={styles.fileName}>{file.name}</span>
        </p>

        <FormSelect
          name="bank"
          label={t("budget.import.settings.bank")}
          description={file.bank ? t("budget.import.settings.bankDetected") : t("budget.import.settings.bankNotDetected")}
          options={bankOptions}
        />
        {/* Not `FormSelect disabled`: react-hook-form would drop a disabled field's value on submit */}
        <Select
          label={t("budget.import.settings.account")}
          name={accountField.name}
          options={accountOptions}
          value={accountOptions.find((option) => option.value === accountField.value) ?? null}
          onChange={(option) => option && accountField.onChange(option.value)}
          onBlur={accountField.onBlur}
          error={accountState.error?.message}
          disabled={accounts.length < 2}
        />
        <FormSelect
          name="fallbackCurrency"
          label={t("budget.import.settings.fallbackCurrency")}
          description={t("budget.import.settings.fallbackCurrencyHint")}
          options={currencyOptions}
          isSearchable
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.footer}>
          <Button type="button" variant="outline" onClick={onBack} disabled={isBusy}>
            {t("budget.import.back")}
          </Button>
          <Button type="submit" variant="brand" isBusy={isBusy}>
            {t("budget.import.settings.next")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
