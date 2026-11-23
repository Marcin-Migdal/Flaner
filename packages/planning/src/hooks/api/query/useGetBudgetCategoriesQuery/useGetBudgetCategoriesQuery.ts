import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetCategories, type BudgetCategoryTree } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The unlocked budget's category trees. Use behind the Budget gate. */
export const useGetBudgetCategoriesQuery = () => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetCategoryTree | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.categories(budget.uid),
    queryFn: () => getBudgetCategories(budget),
    staleTime: Infinity,
  });
};
