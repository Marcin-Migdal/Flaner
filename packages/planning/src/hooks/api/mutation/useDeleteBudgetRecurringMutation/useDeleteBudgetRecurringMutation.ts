import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetRecurring, type BudgetRecurringRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Deletes a recurring transaction; its transactions stay. Errors are left to the caller. */
export const useDeleteBudgetRecurringMutation = (options?: UseMutationOptions<void, Error, BudgetRecurringRef>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, BudgetRecurringRef>(
    {
      mutationKey: ["deleteBudgetRecurring"],
      mutationFn: (recurring) => deleteBudgetRecurring(budget, recurring),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { successMessageKey: "planning:toasts.budget.recurringDeleted", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
