import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetCategory, type BudgetCategoryDeleteInput, type BudgetCategoryTree } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

export const DELETE_BUDGET_CATEGORY_MUTATION_KEY: [string] = ["deleteBudgetCategory"];

/** Settings → Categories: deletes a category, moving what uses it to the replacement. Errors are left to the caller. */
export const useDeleteBudgetCategoryMutation = () => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetCategoryTree, BudgetCategoryDeleteInput>(
    {
      mutationKey: DELETE_BUDGET_CATEGORY_MUTATION_KEY,
      mutationFn: (input) => deleteBudgetCategory(budget, input),
      invalidates: budgetInvalidation.categoryDeleted,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always" },
  );
};
