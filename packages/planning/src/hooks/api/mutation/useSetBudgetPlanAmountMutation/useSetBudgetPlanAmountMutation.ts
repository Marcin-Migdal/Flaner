import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { setBudgetPlanAmount, type BudgetPlan, type BudgetPlanAmountInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Sets or removes a limit / planned income. Errors are left to the caller (No connection toast with Retry). */
export const useSetBudgetPlanAmountMutation = (
  options?: UseMutationOptions<BudgetPlan, Error, BudgetPlanAmountInput>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetPlan, BudgetPlanAmountInput>(
    {
      mutationKey: ["setBudgetPlanAmount"],
      mutationFn: (input) => setBudgetPlanAmount(budget, input),
      invalidates: budgetInvalidation.planChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
