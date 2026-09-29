import * as z from "zod";
import { EXPENSE_CATEGORIES, SPLIT_TYPES } from "../../api/splits/types";
import { hasAtMostTwoDecimals, toMinorUnits } from "../money";

export const getCreateExpenseSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t("splits.validation.titleRequired"))
        .max(80, t("splits.validation.titleMax")),
      amount: z
        .number({ message: t("splits.validation.amountRequired") })
        .positive(t("splits.validation.amountPositive"))
        .refine(hasAtMostTwoDecimals, t("splits.validation.amountDecimals")),
      currency: z.string().min(1, t("splits.validation.currencyRequired")),
      category: z.enum(EXPENSE_CATEGORIES),
      date: z.date({ message: t("splits.validation.dateRequired") }),
      paidBy: z.string().min(1, t("splits.validation.paidByRequired")),
      splitType: z.enum(SPLIT_TYPES),
      splits: z.array(
        z.object({
          userId: z.string(),
          included: z.boolean(),
          amount: z.number().optional(),
        }),
      ),
    })
    .superRefine((data, ctx) => {
      if (data.splitType === "equally") {
        if (!data.splits.some((split) => split.included)) {
          ctx.addIssue({
            code: "custom",
            message: t("splits.validation.splitParticipantsRequired"),
            path: ["splits"],
          });
        }
        return;
      }

      const hasInvalidAmount = data.splits.some(
        (split) => split.amount !== undefined && (split.amount < 0 || !hasAtMostTwoDecimals(split.amount)),
      );
      if (hasInvalidAmount) {
        ctx.addIssue({
          code: "custom",
          message: t("splits.validation.splitAmountInvalid"),
          path: ["splits"],
        });
        return;
      }

      const splitsTotal = data.splits.reduce((sum, split) => sum + toMinorUnits(split.amount ?? 0), 0);
      if (splitsTotal !== toMinorUnits(data.amount)) {
        ctx.addIssue({
          code: "custom",
          message: t("splits.validation.splitSumMismatch"),
          path: ["splits"],
        });
      }
    });

export type CreateExpenseFormData = z.infer<ReturnType<typeof getCreateExpenseSchema>>;
export type ExpenseSplitFormItem = CreateExpenseFormData["splits"][number];
