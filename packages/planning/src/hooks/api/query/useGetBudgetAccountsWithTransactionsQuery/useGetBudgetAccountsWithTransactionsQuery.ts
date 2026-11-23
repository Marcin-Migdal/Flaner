import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetAccountsWithTransactions, type BudgetAccount } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/**
 * Ids of the `accounts` that hold at least one transaction (an account's currency, and the main currency once any
 * is listed, are locked). Waits for the accounts. Use behind the Budget gate.
 */
export const useGetBudgetAccountsWithTransactionsQuery = (accounts: BudgetAccount[] | undefined) => {
  const budget = useUnlockedBudget();

  return useQuery<string[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.accountsWithTransactions(budget.uid),
    queryFn: () => getBudgetAccountsWithTransactions(budget, (accounts ?? []).map(({ id }) => id)),
    enabled: !!accounts,
    staleTime: Infinity,
  });
};
