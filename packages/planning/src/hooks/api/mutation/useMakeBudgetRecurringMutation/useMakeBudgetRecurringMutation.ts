import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import {
  makeBudgetTransactionRecurring,
  type BudgetRecurring,
  type BudgetTransaction,
  type RepeatRuleInput,
} from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

export type MakeBudgetRecurringVariables = { transaction: BudgetTransaction; rule: RepeatRuleInput };

/** Make recurring: the transaction becomes the first occurrence. Errors are left to the caller. */
export const useMakeBudgetRecurringMutation = (
  options?: UseMutationOptions<BudgetRecurring, Error, MakeBudgetRecurringVariables>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetRecurring, MakeBudgetRecurringVariables>(
    {
      mutationKey: ["makeBudgetRecurring"],
      mutationFn: ({ transaction, rule }) => makeBudgetTransactionRecurring(budget, transaction, rule),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { successMessageKey: "planning:toasts.budget.recurringMade", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
