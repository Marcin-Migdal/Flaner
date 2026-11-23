import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetPlan, type BudgetMonth, type BudgetPlan } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The month's plan (`null` while it has none). Cached like the month's transactions. Use behind the Budget gate. */
export const useGetBudgetPlanQuery = (month: BudgetMonth) => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetPlan | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.plan(budget.uid, month),
    queryFn: () => getBudgetPlan(budget, month),
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
