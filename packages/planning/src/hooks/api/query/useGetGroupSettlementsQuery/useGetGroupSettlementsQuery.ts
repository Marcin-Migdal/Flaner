import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupSettlements, type Settlement } from "../../../../api/splits";
import { splitKeys } from "../../queryKeys";

/** Fetched, refreshed by `useSyncSplitGroupFeed` when the realtime group document changes. */
export const useGetGroupSettlementsQuery = (
  groupId: string | undefined,
  options?: Omit<UseQueryOptions<Settlement[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Settlement[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: splitKeys.settlements(groupId ?? ""),
    queryFn: () => {
      if (!groupId) throw new Error("planning:errors.splitGroupMissing");
      return getGroupSettlements(groupId);
    },
    enabled: !!groupId,
    ...options,
  });
};
