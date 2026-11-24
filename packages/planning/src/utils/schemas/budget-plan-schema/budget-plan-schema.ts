import * as z from "zod";
import { hasAtMostTwoDecimals } from "@flaner/shared/utils";

/** The Add limit / Add planned income dialog: a category or subcategory and a positive amount in the main currency. */
export const getBudgetPlanAmountSchema = (t: (key: string) => string) =>
  z.object({
    categoryId: z.string({ message: t("budget.validation.categoryRequired") }).min(1, t("budget.validation.categoryRequired")),
    amount: z
      .number({ message: t("budget.validation.amountRequired") })
      .positive(t("budget.validation.amountPositive"))
      .refine(hasAtMostTwoDecimals, t("budget.validation.amountDecimals")),
  });

export type BudgetPlanAmountFormData = z.infer<ReturnType<typeof getBudgetPlanAmountSchema>>;
