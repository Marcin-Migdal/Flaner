import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetRule, type BudgetRule } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Settings → Rules: deletes a rule (by `ruleId`). Errors are left to the caller. */
export const useDeleteBudgetRuleMutation = (options?: UseMutationOptions<BudgetRule[], Error, string>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetRule[], string>(
    {
      mutationKey: ["deleteBudgetRule"],
      mutationFn: (ruleId) => deleteBudgetRule(budget, ruleId),
      invalidates: budgetInvalidation.rulesChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
