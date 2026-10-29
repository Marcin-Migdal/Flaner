import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupSettlements, type Settlement } from "../../../../api/splits";

export const getGroupSettlementsQueryKeys = (groupId: string) => ["splitGroups", groupId, "settlements"];

export const useGetGroupSettlementsQuery = (
  groupId: string | undefined,
  options?: Omit<UseQueryOptions<Settlement[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Settlement[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getGroupSettlementsQueryKeys(groupId ?? ""),
    queryFn: () => {
      if (!groupId) throw new Error("planning:errors.splitGroupMissing");
      return getGroupSettlements(groupId);
    },
    enabled: !!groupId,
    ...options,
  });
};

export const useInvalidateGroupSettlementsQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupSettlementsQueryKeys(groupId) });
};

export default useGetGroupSettlementsQuery;
