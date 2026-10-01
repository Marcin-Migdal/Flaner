import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupExpenses, type Expense } from "../../../../api/splits";

export const getGroupExpensesQueryKeys = (groupId: string) => ["splitGroups", groupId, "expenses"];

export const useGetGroupExpensesQuery = (
  groupId: string | undefined,
  options?: Omit<UseQueryOptions<Expense[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Expense[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getGroupExpensesQueryKeys(groupId ?? ""),
    queryFn: () => {
      if (!groupId) throw new Error("planning:errors.splitGroupMissing");
      return getGroupExpenses(groupId);
    },
    enabled: !!groupId,
    ...options,
  });
};

export const useInvalidateGroupExpensesQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupExpensesQueryKeys(groupId) });
};

export default useGetGroupExpensesQuery;
