import * as z from "zod";
import { STATEMENT_BANKS } from "../../statementImport/types";
import { getBudgetAmountSchema } from "../budget-transaction-schema";

/** Import wizard, Settings step. */
export const getImportSettingsSchema = (t: (key: string) => string) =>
  z.object({
    bank: z.enum(STATEMENT_BANKS, { message: t("budget.import.validation.bankRequired") }),
    accountId: z.string().min(1, t("budget.validation.accountRequired")),
    fallbackCurrency: z.string().min(1, t("budget.validation.currencyRequired")),
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
