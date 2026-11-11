import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupExpenses, type Expense } from "../../../../api/splits";
import { splitKeys } from "../../queryKeys";

/** Fetched, refreshed by `useSyncSplitGroupFeed` when the realtime group document changes. */
export const useGetGroupExpensesQuery = (
  groupId: string | undefined,
  options?: Omit<UseQueryOptions<Expense[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Expense[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: splitKeys.expenses(groupId ?? ""),
    queryFn: () => {
      if (!groupId) throw new Error("planning:errors.splitGroupMissing");
      return getGroupExpenses(groupId);
    },
    enabled: !!groupId,
    ...options,
  });
};
