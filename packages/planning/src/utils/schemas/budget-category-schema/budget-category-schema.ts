import * as z from "zod";
import { BUDGET_CATEGORY_ICONS, CHART_COLOR_INDEXES } from "../../../api/budget";

/** Add / edit category: name, and (main categories) icon and one of the 8 chart colours. */
export const getBudgetCategorySchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("budget.validation.categoryNameRequired"))
      .max(40, t("budget.validation.categoryNameMax")),
    icon: z.enum(BUDGET_CATEGORY_ICONS),
    color: z.literal(CHART_COLOR_INDEXES),
  });

export type BudgetCategoryFormData = z.infer<ReturnType<typeof getBudgetCategorySchema>>;
