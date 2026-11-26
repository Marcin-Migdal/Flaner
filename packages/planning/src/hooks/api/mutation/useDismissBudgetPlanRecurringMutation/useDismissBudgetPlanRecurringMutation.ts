import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { dismissBudgetPlanRecurring, type BudgetMonth, type BudgetPlan } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type DismissInput = { month: BudgetMonth; recurringId: string };

/** Dismisses a missing-limit banner in its month only. Errors are left to the caller. */
export const useDismissBudgetPlanRecurringMutation = (options?: UseMutationOptions<BudgetPlan, Error, DismissInput>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetPlan, DismissInput>(
    {
      mutationKey: ["dismissBudgetPlanRecurring"],
      mutationFn: (input) => dismissBudgetPlanRecurring(budget, input),
      invalidates: budgetInvalidation.planChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
