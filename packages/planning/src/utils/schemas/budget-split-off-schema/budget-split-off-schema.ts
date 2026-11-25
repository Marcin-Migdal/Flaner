import * as z from "zod";
import { toMinorUnits } from "@flaner/shared/utils";
import { getBudgetAmountSchema } from "../budget-transaction-schema";

export const BUDGET_SPLIT_OFF_NOTE_MAX = 200;

/**
 * The split-off dialog. `room` (minor units): what the split-off may take at most minus one minor unit — the sum
 * of split-offs stays below the transaction's total.
 */
export const getBudgetSplitOffSchema = (t: (key: string) => string, room: number) =>
  z.object({
    amount: getBudgetAmountSchema(t).refine((amount) => toMinorUnits(amount) < room, t("budget.validation.splitOffTooLarge")),
    categoryId: z.string().nullable(),
    note: z.string().trim().max(BUDGET_SPLIT_OFF_NOTE_MAX, t("budget.validation.noteMax")),
  });

export type BudgetSplitOffFormData = z.infer<ReturnType<typeof getBudgetSplitOffSchema>>;
