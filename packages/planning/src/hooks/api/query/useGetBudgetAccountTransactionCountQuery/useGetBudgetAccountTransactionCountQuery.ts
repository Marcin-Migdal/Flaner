import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { countBudgetAccountTransactions } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/** How many transactions the account holds; fetched fresh while `accountId` is set (delete confirmation). */
export const useGetBudgetAccountTransactionCountQuery = (accountId: string | null) => {
  const budget = useUnlockedBudget();

  return useQuery<number, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.accountTransactionCount(budget.uid, accountId ?? ""),
    queryFn: () => countBudgetAccountTransactions(budget, accountId ?? ""),
    enabled: accountId !== null,
    staleTime: 0,
    gcTime: 0,
  });
};
