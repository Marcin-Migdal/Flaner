import * as z from "zod";
import { hasAtMostTwoDecimals } from "@flaner/shared/utils";
import { BUDGET_CATEGORY_TYPES } from "../../../api/budget/types";

export const BUDGET_PAYEE_MAX = 120;
export const BUDGET_DESCRIPTION_MAX = 500;

const money = (t: (key: string) => string) =>
  z
    .number({ message: t("budget.validation.amountRequired") })
    .positive(t("budget.validation.amountPositive"))
    .refine(hasAtMostTwoDecimals, t("budget.validation.amountDecimals"));

/** The Add transaction form. `amountMain` is required only for a currency other than `mainCurrency`. */
export const getBudgetTransactionSchema = (t: (key: string) => string, mainCurrency: string) =>
  z
    .object({
      type: z.enum(BUDGET_CATEGORY_TYPES),
      amount: money(t),
      currency: z.string().min(1, t("budget.validation.currencyRequired")),
      amountMain: z.number().nullable(),
      rateOverridden: z.boolean(),
      date: z.date({ message: t("budget.validation.dateRequired") }),
      payee: z
        .string()
        .trim()
        .min(1, t("budget.validation.payeeRequired"))
        .max(BUDGET_PAYEE_MAX, t("budget.validation.payeeMax")),
      description: z.string().trim().max(BUDGET_DESCRIPTION_MAX, t("budget.validation.descriptionMax")),
      accountId: z.string().min(1, t("budget.validation.accountRequired")),
      categoryId: z.string().nullable(),
    })
    .superRefine((data, ctx) => {
      if (data.currency === mainCurrency) return;
      const result = money(t).safeParse(data.amountMain);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: result.error.issues[0].message, path: ["amountMain"] });
      }
    });

export type BudgetTransactionFormData = z.infer<ReturnType<typeof getBudgetTransactionSchema>>;
