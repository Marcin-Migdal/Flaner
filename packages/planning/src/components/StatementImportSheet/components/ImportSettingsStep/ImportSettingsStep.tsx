import { useCurrencyOptions } from "@flaner/shared/hooks";
import { Button, FormSelect, Select } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { FormProvider, useController, useForm, useWatch, type Control } from "react-hook-form";
import type { BudgetAccount, ImportTemplate } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  countFileAccountRows,
  findImportTemplate,
  importTemplateKey,
  isStatementTransactionRow,
  maskFileAccount,
  STATEMENT_BANKS,
} from "../../../../utils/statementImport";
import {
  CUSTOM_MAPPING,
  getImportSettingsSchema,
  SKIP_FILE_ACCOUNT,
  type ImportSettingsFormData,
} from "../../../../utils/schemas";
import { blankMapping, readImportRows, resolveImportSource, NEW_TEMPLATE_FILE_ACCOUNT } from "../../importSource";
import type { ImportFile } from "../../types";
import { ImportColumnMapping } from "../ImportColumnMapping";
import { importSettingsStepStyles as styles } from "./ImportSettingsStep.styles";

type SelectOption = { value: string; label: string };

export type ImportSettingsStepProps = {
  file: ImportFile;
  accounts: BudgetAccount[];
  /** The user's saved import templates. */
  templates: ImportTemplate[];
  /** `mapping` defaults to every column ignored. */
  defaultValues: Partial<ImportSettingsFormData>;
  /** The preselected target of a bank account (remembered mapping, else the main account for a one-account file). */
  defaultTarget: (fileAccount: string, isOnlyAccount: boolean) => string;
  /** The preview is being built. */
  isBusy: boolean;
  /** Why the preview could not be built. */
  error: string | null;
  onBack: () => void;
  onSubmit: (settings: ImportSettingsFormData) => void;
};

/**
 * Import wizard, Settings step: bank or import template (detected from the header, can be changed) or a column
 * mapping for any other CSV, the target of each bank account of the file (one account: a Flaner account; several:
 * a Flaner account each or skipped) and fallback currency.
 */
export const ImportSettingsStep = ({
  file,
  accounts,
  templates,
  defaultValues,
  defaultTarget,
  isBusy,
  error,
  onBack,
  onSubmit,
}: ImportSettingsStepProps) => {
  const { t } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const header = useMemo(() => file.records[0] ?? [], [file.records]);
  const methods = useForm<ImportSettingsFormData>({
    resolver: zodResolver(getImportSettingsSchema(t)),
    defaultValues: { mapping: blankMapping(header), ...defaultValues },
  });
  const { control, getValues, setValue } = methods;

  const bank = useWatch({ control, name: "bank" });
  const mapping = useWatch({ control, name: "mapping" });
  const source = useMemo(
    () => (bank ? resolveImportSource({ bank, mapping }, header, templates) : null),
    [bank, mapping, header, templates],
  );
  const rows = useMemo(() => readImportRows(source, file.records), [source, file.records]);
  const readCount = rows.filter(isStatementTransactionRow).length;
  // The file's bank accounts with their row counts, in file order; a template-read file has exactly one, keyed by
  // the template (a new mapping's by a placeholder, so typing its name doesn't reset the target)
  const templateAccount =
    source?.kind === "template" ? (source.isNew ? NEW_TEMPLATE_FILE_ACCOUNT : importTemplateKey(source.template.name)) : null;
  const fileAccounts = useMemo(
    () => (templateAccount ? new Map([[templateAccount, readCount]]) : countFileAccountRows(rows)),
    [templateAccount, readCount, rows],
  );
  const isMultiAccount = fileAccounts.size > 1;

  // A (re)chosen bank reads the file again: its bank accounts get their preselected targets
  useEffect(() => {
    const listed = [...fileAccounts.keys()];
    const current = getValues("fileAccounts") ?? [];
    if (listed.length === current.length && listed.every((fileAccount, index) => current[index]?.fileAccount === fileAccount)) {
      return;
    }
    setValue(
      "fileAccounts",
      listed.map((fileAccount) => ({ fileAccount, target: defaultTarget(fileAccount, listed.length === 1) })),
    );
  }, [fileAccounts, defaultTarget, getValues, setValue]);

  const bankOptions = useMemo(
    () => [
      {
        label: t("budget.import.settings.banksGroup"),
        options: STATEMENT_BANKS.map((option) => ({ value: option, label: t(`budget.import.banks.${option}`) })),
      },
      ...(templates.length > 0
        ? [
            {
              label: t("budget.import.settings.templatesGroup"),
              options: templates.map(({ name }) => ({ value: importTemplateKey(name), label: name })),
            },
          ]
        : []),
      { label: t("budget.import.settings.otherGroup"), options: [{ value: CUSTOM_MAPPING, label: t("budget.import.settings.customMapping") }] },
    ],
    [t, templates],
  );
  const isRecognized = file.bank !== null || findImportTemplate(templates, header) !== null;
  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );
  const accountOrSkipOptions = useMemo(
    () => [...accountOptions, { value: SKIP_FILE_ACCOUNT, label: t("budget.import.settings.skipAccount") }],
    [accountOptions, t],
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
          description={isRecognized ? t("budget.import.settings.bankDetected") : t("budget.import.settings.bankNotDetected")}
          options={bankOptions}
        />

        {bank === CUSTOM_MAPPING && (
          <ImportColumnMapping records={file.records} readCount={readCount} />
        )}

        {isMultiAccount ? (
          <fieldset className={styles.fileAccounts}>
            <legend className={styles.fileAccountsLegend}>{t("budget.import.settings.fileAccounts")}</legend>
            <p className={styles.fileAccountsHint}>{t("budget.import.settings.fileAccountsHint")}</p>
            {[...fileAccounts].map(([fileAccount, rowCount], index) => (
              <TargetSelect
                key={fileAccount}
                control={control}
                index={index}
                label={maskFileAccount(fileAccount)}
                description={t("budget.import.settings.fileAccountRows", { count: rowCount })}
                options={accountOrSkipOptions}
              />
            ))}
          </fieldset>
        ) : (
          fileAccounts.size === 1 && (
          <TargetSelect
            control={control}
            index={0}
            label={t("budget.import.settings.account")}
            options={accountOptions}
            disabled={accounts.length < 2}
          />
          )
        )}

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

type TargetSelectProps = {
  control: Control<ImportSettingsFormData>;
  index: number;
  label: string;
  description?: string;
  options: SelectOption[];
  disabled?: boolean;
};

/** Where one bank account of the file goes. Not `FormSelect disabled`: react-hook-form would drop a disabled field's value on submit. */
const TargetSelect = ({ control, index, label, description, options, disabled }: TargetSelectProps) => {
  const { field, fieldState } = useController({ control, name: `fileAccounts.${index}.target` });

  return (
    <Select
      label={label}
      description={description}
      name={field.name}
      options={options}
      value={options.find((option) => option.value === field.value) ?? null}
      onChange={(option) => option && field.onChange(option.value)}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
      disabled={disabled}
    />
  );
};
