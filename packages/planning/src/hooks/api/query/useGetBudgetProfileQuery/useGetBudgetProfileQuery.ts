import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetProfile, type BudgetProfile } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The unlocked budget's profile (main currency, main account). Use behind the Budget gate. */
export const useGetBudgetProfileQuery = () => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetProfile | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.profile(budget.uid),
    queryFn: () => getBudgetProfile(budget),
    staleTime: Infinity,
  });
};
