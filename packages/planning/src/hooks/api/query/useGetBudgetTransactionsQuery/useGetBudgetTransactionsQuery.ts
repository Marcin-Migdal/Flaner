import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetTransactions, type BudgetMonth, type BudgetTransaction } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/**
 * The transactions of all the user's accounts dated in `month`. A loaded month stays cached (and browsable offline);
 * only budget writes make it stale. Use behind the Budget gate.
 */
export const useGetBudgetTransactionsQuery = (month: BudgetMonth) => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetTransaction[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.transactions(budget.uid, month),
    queryFn: () => getBudgetTransactions(budget, { from: month, to: month }),
    staleTime: Infinity,
    // Keeps the previous month on screen while the next one loads
    placeholderData: keepPreviousData,
  });
};
