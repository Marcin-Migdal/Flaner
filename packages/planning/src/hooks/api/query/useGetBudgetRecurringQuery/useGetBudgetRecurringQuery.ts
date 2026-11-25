import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetRecurring, type BudgetRecurring } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** Every recurring transaction with its matches (Recurring tab, recurring marker). Use behind the Budget gate. */
export const useGetBudgetRecurringQuery = () => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetRecurring[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.recurring(budget.uid),
    queryFn: () => getBudgetRecurring(budget),
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
