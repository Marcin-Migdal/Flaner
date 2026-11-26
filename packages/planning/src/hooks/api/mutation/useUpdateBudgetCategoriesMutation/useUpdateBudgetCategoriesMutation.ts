import { useQueryClient } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import {
  updateBudgetCategories,
  type BudgetCategoryTree,
  type BudgetCategoryTreeChange,
} from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/**
 * Settings → Categories: add, rename, icon / colour, reorder. Shown at once (a dropped row stays where it was
 * dropped), rolled back when the write fails; the saved tree replaces the cached one. Errors are left to the caller.
 */
export const useUpdateBudgetCategoriesMutation = () => {
  const budget = useUnlockedBudget();
  const queryClient = useQueryClient();
  const key = budgetKeys.categories(budget.uid);

  return useUserMutation<BudgetCategoryTree, BudgetCategoryTreeChange>(
    {
      mutationKey: ["updateBudgetCategories"],
      mutationFn: (change) => updateBudgetCategories(budget, change),
      meta: { skipErrorToast: true },
    },
    {
      // Fails at once offline instead of waiting paused for the connection
      networkMode: "always",
      onMutate: (change) => {
        const previous = queryClient.getQueryData<BudgetCategoryTree | null>(key);
        if (previous) queryClient.setQueryData(key, change(previous));
        return previous;
      },
      onError: (_error, _change, previous) => queryClient.setQueryData(key, previous),
      onSuccess: (tree) => queryClient.setQueryData(key, tree),
    },
  );
};
