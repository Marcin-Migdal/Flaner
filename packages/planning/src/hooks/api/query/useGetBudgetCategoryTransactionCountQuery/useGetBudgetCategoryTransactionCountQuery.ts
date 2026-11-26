import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { countBudgetCategoryTransactions } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** How many transactions use the categories; fetched fresh while `categoryIds` is set (delete confirmation). */
export const useGetBudgetCategoryTransactionCountQuery = (categoryIds: string[] | null) => {
  const budget = useUnlockedBudget();

  return useQuery<number, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.categoryTransactionCount(budget.uid, categoryIds ?? []),
    queryFn: () => countBudgetCategoryTransactions(budget, categoryIds ?? []),
    enabled: categoryIds !== null,
    staleTime: 0,
    gcTime: 0,
  });
};
