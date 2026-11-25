import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetRules, type BudgetRule } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The unlocked budget's categorization rules. Use behind the Budget gate. */
export const useGetBudgetRulesQuery = () => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetRule[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.rules(budget.uid),
    queryFn: () => getBudgetRules(budget),
    staleTime: Infinity,
  });
};
