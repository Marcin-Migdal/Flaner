import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateBudgetRecurringRule, type BudgetRecurringRef, type RepeatRuleInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

export type UpdateBudgetRecurringRuleVariables = { recurring: BudgetRecurringRef; rule: RepeatRuleInput };

/** Edit rule (applies from today). Errors are left to the caller. */
export const useUpdateBudgetRecurringRuleMutation = (
  options?: UseMutationOptions<void, Error, UpdateBudgetRecurringRuleVariables>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, UpdateBudgetRecurringRuleVariables>(
    {
      mutationKey: ["updateBudgetRecurringRule"],
      mutationFn: ({ recurring, rule }) => updateBudgetRecurringRule(budget, recurring, rule),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { successMessageKey: "planning:toasts.budget.recurringSaved", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
