import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetAccounts, type BudgetAccount } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** The unlocked budget's accounts, oldest first. Use behind the Budget gate. */
export const useGetBudgetAccountsQuery = () => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetAccount[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.accounts(budget.uid),
    queryFn: () => getBudgetAccounts(budget),
    staleTime: Infinity,
  });
};
