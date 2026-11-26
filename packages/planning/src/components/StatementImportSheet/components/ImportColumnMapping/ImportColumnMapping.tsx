import { FormSelect, FormTextField } from "@flaner/ui-components";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import {
  IMPORT_COLUMN_ROLES,
  IMPORT_DATE_FORMATS,
  IMPORT_DECIMAL_SEPARATORS,
  type ImportDateFormat,
} from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { TEMPLATE_NAME_MAX_LENGTH, type ImportSettingsFormData } from "../../../../utils/schemas";
import { importColumnMappingStyles as styles } from "./ImportColumnMapping.styles";

/** How many of the first rows give each column its sample values. */
const SAMPLE_ROWS = 3;
const SAMPLE_LENGTH = 32;

export type ImportColumnMappingProps = {
  /** Every record of the file, header first. */
  records: string[][];
  /** Rows the current mapping reads without an error. */
  readCount: number;
};

/**
 * Import wizard, Settings step for a file no bank or template recognizes: what each column holds (shown with the
 * values of the first rows), how dates and amounts are written, and the name the mapping is saved under.
 */
export const ImportColumnMapping = ({ records, readCount }: ImportColumnMappingProps) => {
  const { t } = usePlanningTranslations();
  const {
    formState: { errors },
  } = useFormContext<ImportSettingsFormData>();
  const [header = [], ...rows] = records;

  const roleOptions = useMemo(
    () => IMPORT_COLUMN_ROLES.map((role) => ({ value: role, label: t(`budget.import.mapping.roles.${role}`) })),
    [t],
  );
  const dateFormatOptions = useMemo(() => {
    const tokens = {
      YYYY: t("budget.import.mapping.dateTokens.year"),
      MM: t("budget.import.mapping.dateTokens.month"),
      DD: t("budget.import.mapping.dateTokens.day"),
    };
    const sample = { YYYY: "2026", MM: "11", DD: "28" };
    const fill = (format: ImportDateFormat, values: Record<string, string>) =>
      format.replace(/YYYY|MM|DD/g, (token) => values[token] ?? token);
    return IMPORT_DATE_FORMATS.map((format) => ({ value: format, label: `${fill(format, tokens)} (${fill(format, sample)})` }));
  }, [t]);
  const decimalOptions = useMemo(
    () =>
      IMPORT_DECIMAL_SEPARATORS.map((separator) => ({
        value: separator,
        label: t(`budget.import.mapping.decimal.${separator === "," ? "comma" : "dot"}`),
      })),
    [t],
  );

  const samplesOf = (index: number) =>
    rows
      .slice(0, SAMPLE_ROWS)
      .map((row) => row[index]?.trim() ?? "")
      .map((value) => (value.length > SAMPLE_LENGTH ? `${value.slice(0, SAMPLE_LENGTH)}…` : value))
      .map((value) => value || "—")
      .join(" · ");

  // A resolver error on an array of registered fields lands on its `root`
  const columnsError = errors.mapping?.columns?.root?.message ?? errors.mapping?.columns?.message;

  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{t("budget.import.mapping.title")}</legend>
      <p className={styles.hint}>{t("budget.import.mapping.hint")}</p>

      <FormTextField<ImportSettingsFormData>
        name="mapping.name"
        label={t("budget.import.mapping.name")}
        description={t("budget.import.mapping.nameHint")}
        maxLength={TEMPLATE_NAME_MAX_LENGTH}
      />

      <div className={styles.formats}>
        <FormSelect<ImportSettingsFormData>
          name="mapping.dateFormat"
          label={t("budget.import.mapping.dateFormat")}
          options={dateFormatOptions}
        />
        <FormSelect<ImportSettingsFormData>
          name="mapping.decimalSeparator"
          label={t("budget.import.mapping.decimalSeparator")}
          options={decimalOptions}
        />
      </div>

      <div className={styles.columns}>
        {header.map((name, index) => (
          <FormSelect<ImportSettingsFormData>
            key={index}
            name={`mapping.columns.${index}`}
            label={name.trim() || t("budget.import.mapping.column", { number: index + 1 })}
            description={samplesOf(index)}
            options={roleOptions}
          />
        ))}
      </div>

      {columnsError ? (
        <p role="alert" className={styles.error}>
          {columnsError}
        </p>
      ) : (
        <p className={styles.summary}>
          {t("budget.import.mapping.readRows", { count: readCount, total: rows.length })}
        </p>
      )}
    </fieldset>
  );
};
