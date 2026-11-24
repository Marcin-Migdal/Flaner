import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { stopBudgetRecurring, type BudgetRecurringRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Stop: nothing is due from today on; paid occurrences stay. Errors are left to the caller. */
export const useStopBudgetRecurringMutation = (options?: UseMutationOptions<void, Error, BudgetRecurringRef>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, BudgetRecurringRef>(
    {
      mutationKey: ["stopBudgetRecurring"],
      mutationFn: (recurring) => stopBudgetRecurring(budget, recurring),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { successMessageKey: "planning:toasts.budget.recurringStopped", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
