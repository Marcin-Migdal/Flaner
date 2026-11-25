import * as z from "zod";
import { toMinorUnits } from "@flaner/shared/utils";
import { getBudgetAmountSchema } from "../budget-transaction-schema";

/**
 * The Link a refund dialog: the picked refund and the refund split-off's amount in the purchase's currency, below
 * `room` (minor units: the purchase's rest, or the split-off the refund is carved out of).
 */
export const getBudgetRefundLinkSchema = (t: (key: string) => string, room: number) =>
  z.object({
    refundId: z.string({ message: t("budget.validation.refundRequired") }).min(1, t("budget.validation.refundRequired")),
    amount: getBudgetAmountSchema(t).refine((amount) => toMinorUnits(amount) < room, t("budget.validation.refundTooLarge")),
  });

export type BudgetRefundLinkFormData = z.infer<ReturnType<typeof getBudgetRefundLinkSchema>>;
