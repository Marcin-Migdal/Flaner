import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getLastBudgetPlanBefore, type BudgetMonth, type BudgetPlan } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The latest plan before `month` (`null` when none), for an empty month's start. Use behind the Budget gate. */
export const useGetLastBudgetPlanBeforeQuery = (month: BudgetMonth, { enabled }: { enabled: boolean }) => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetPlan | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.lastPlanBefore(budget.uid, month),
    queryFn: () => getLastBudgetPlanBefore(budget, month),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
