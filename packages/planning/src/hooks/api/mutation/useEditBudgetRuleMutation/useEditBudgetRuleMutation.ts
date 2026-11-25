import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { editBudgetRule, type BudgetRule, type BudgetRuleChanges } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

export type EditBudgetRuleInput = { ruleId: string; changes: BudgetRuleChanges };

/** Settings → Rules: changes a rule's category or shortens its keyword. Errors are left to the caller. */
export const useEditBudgetRuleMutation = (
  options?: UseMutationOptions<BudgetRule[], Error, EditBudgetRuleInput>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetRule[], EditBudgetRuleInput>(
    {
      mutationKey: ["editBudgetRule"],
      mutationFn: ({ ruleId, changes }) => editBudgetRule(budget, ruleId, changes),
      invalidates: budgetInvalidation.rulesChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
