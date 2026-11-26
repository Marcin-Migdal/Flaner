import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { startBudgetPlan, type BudgetPlan } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Starts an empty month's plan (copy or empty, with the prefill limits). Errors are left to the caller. */
export const useStartBudgetPlanMutation = (options?: UseMutationOptions<BudgetPlan, Error, BudgetPlan>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetPlan, BudgetPlan>(
    {
      mutationKey: ["startBudgetPlan"],
      mutationFn: (plan) => startBudgetPlan(budget, plan),
      invalidates: budgetInvalidation.planChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
