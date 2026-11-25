import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetTransactions, type BudgetMonth, type BudgetTransaction } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

/**
 * The transactions of all the user's accounts dated in the months `from`..`to` (e.g. refund candidates). Fetched
 * again whenever it is used anew, so a dialog never offers a stale candidate. Use behind the Budget gate.
 */
export const useGetBudgetTransactionsRangeQuery = (
  { from, to }: { from: BudgetMonth; to: BudgetMonth },
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const budget = useUnlockedBudget();

  return useQuery<BudgetTransaction[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.transactionsRange(budget.uid, from, to),
    queryFn: () => getBudgetTransactions(budget, { from, to }),
    enabled,
    staleTime: 0,
  });
};
