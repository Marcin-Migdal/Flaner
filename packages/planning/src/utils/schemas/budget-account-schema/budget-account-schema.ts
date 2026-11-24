import * as z from "zod";

/** Add / edit account: name and default currency. */
export const getBudgetAccountSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("budget.validation.accountNameRequired"))
      .max(60, t("budget.validation.accountNameMax")),
    defaultCurrency: z.string().min(1, t("budget.validation.currencyRequired")),
  });

export type BudgetAccountFormData = z.infer<ReturnType<typeof getBudgetAccountSchema>>;
