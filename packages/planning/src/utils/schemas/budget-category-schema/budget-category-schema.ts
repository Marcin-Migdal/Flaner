import * as z from "zod";
import { BUDGET_CATEGORY_ICONS } from "../../../api/budget";

/** Add / edit category: name, and (main categories) icon and one of the 8 chart colours. */
export const getBudgetCategorySchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("budget.validation.categoryNameRequired"))
      .max(40, t("budget.validation.categoryNameMax")),
    icon: z.enum(BUDGET_CATEGORY_ICONS),
    color: z.literal([1, 2, 3, 4, 5, 6, 7, 8]),
  });

export type BudgetCategoryFormData = z.infer<ReturnType<typeof getBudgetCategorySchema>>;
