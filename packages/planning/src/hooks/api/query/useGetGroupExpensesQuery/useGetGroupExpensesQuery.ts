import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupExpenses, type Expense, type SplitGroup } from "../../../../api/splits";
import { splitKeys } from "../../queryKeys";

/**
 * Fetched, refreshed by `useSyncSplitGroupFeed` when the realtime group document changes.
 * With `expensesCount` 0 there is nothing to read: a just created group is listed before the server has it,
 * and a read then would be denied (#106).
 */
export const useGetGroupExpensesQuery = (
  group: Pick<SplitGroup, "id" | "expensesCount"> | undefined,
  options?: Omit<UseQueryOptions<Expense[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Expense[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: splitKeys.expenses(group?.id ?? ""),
    queryFn: () => {
      if (!group) throw new Error("planning:errors.splitGroupMissing");
      return group.expensesCount === 0 ? [] : getGroupExpenses(group.id);
    },
    enabled: !!group,
    ...options,
  });
};
