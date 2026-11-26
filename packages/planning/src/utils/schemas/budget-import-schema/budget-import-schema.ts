import * as z from "zod";
import { IMPORT_COLUMN_ROLES, IMPORT_DATE_FORMATS, IMPORT_DECIMAL_SEPARATORS } from "../../../api/budget";
import { validateImportColumns } from "../../statementImport/importTemplate";
import { getBudgetAmountSchema } from "../budget-transaction-schema";

/** An import Settings target that skips the bank account's rows (never a Flaner account id). */
export const SKIP_FILE_ACCOUNT = "skip";

/** Import Settings "bank" choice: map the file's columns (and save them as a new import template). */
export const CUSTOM_MAPPING = "custom";

export const TEMPLATE_NAME_MAX_LENGTH = 40;

/** Import wizard, Settings step: each bank account of the file goes to a Flaner account or is skipped. */
export const getImportSettingsSchema = (t: (key: string) => string) =>
  z
    .object({
      /** A `StatementBank`, `importTemplateKey(name)` of a saved template, or `CUSTOM_MAPPING`. */
      bank: z.string({ message: t("budget.import.validation.bankRequired") }).min(1, t("budget.import.validation.bankRequired")),
      /** The column mapping used with `CUSTOM_MAPPING`, saved as an import template under `name`. */
      mapping: z.object({
        name: z.string().max(TEMPLATE_NAME_MAX_LENGTH, t("budget.import.validation.templateNameTooLong")),
        columns: z.array(z.enum(IMPORT_COLUMN_ROLES)),
        dateFormat: z.enum(IMPORT_DATE_FORMATS),
        decimalSeparator: z.enum(IMPORT_DECIMAL_SEPARATORS),
      }),
      fileAccounts: z.array(
        z.object({
          fileAccount: z.string(),
          /** A Flaner account id or `SKIP_FILE_ACCOUNT`. */
          target: z.string().min(1, t("budget.validation.accountRequired")),
        }),
      ),
      fallbackCurrency: z.string().min(1, t("budget.validation.currencyRequired")),
    })
    .superRefine(({ bank, mapping }, ctx) => {
      if (bank !== CUSTOM_MAPPING) return;
      if (!mapping.name.trim()) {
        ctx.addIssue({ code: "custom", path: ["mapping", "name"], message: t("budget.import.validation.templateNameRequired") });
      }
      const columnsError = validateImportColumns(mapping.columns);
      if (columnsError) {
        ctx.addIssue({
          code: "custom",
          path: ["mapping", "columns"],
          message: t(`budget.import.validation.columns.${columnsError}`),
        });
      }
    });

export type ImportSettingsFormData = z.infer<ReturnType<typeof getImportSettingsSchema>>;

/** Import preview: editing one row's amount and category. */
export const getImportRowSchema = (t: (key: string) => string) =>
  z.object({
    amount: getBudgetAmountSchema(t),
    currency: z.string(),
    categoryId: z.string().nullable(),
  });

export type ImportRowFormData = z.infer<ReturnType<typeof getImportRowSchema>>;
