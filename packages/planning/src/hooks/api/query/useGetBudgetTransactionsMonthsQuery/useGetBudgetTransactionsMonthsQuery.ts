import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getBudgetTransactions, type BudgetMonth, type BudgetTransaction } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetKeys } from "../../queryKeys";

export type BudgetTransactionsMonthsResult = {
  /** Every month's transactions together; `undefined` until all months have loaded. */
  data: BudgetTransaction[] | undefined;
  isPending: boolean;
  isError: boolean;
  /** Some month never loaded and waits for the connection (offline). */
  isPaused: boolean;
};

// Module level, so TanStack Query keeps the combined result (and its `data` array) while the months are unchanged
const combine = (results: UseQueryResult<BudgetTransaction[], Error>[]): BudgetTransactionsMonthsResult => ({
  data: results.every((result) => result.data) ? results.flatMap((result) => result.data ?? []) : undefined,
  isPending: results.some((result) => result.isPending),
  isError: results.some((result) => result.isError),
  isPaused: results.some((result) => result.isPending && result.fetchStatus === "paused"),
});

/**
 * The transactions of several months (e.g. Summary's 12 bars), one query per month under the same key as
 * `useGetBudgetTransactionsQuery`: months already opened come from the cache and stay browsable offline, and budget
 * writes make exactly their month stale. Use behind the Budget gate.
 */
export const useGetBudgetTransactionsMonthsQuery = (months: BudgetMonth[]): BudgetTransactionsMonthsResult => {
  const budget = useUnlockedBudget();

  return useQueries({
    queries: months.map((month) => ({
      meta: reactQueryMeta.fetch,
      queryKey: budgetKeys.transactions(budget.uid, month),
      queryFn: () => getBudgetTransactions(budget, { from: month, to: month }),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
    combine,
  });
};
