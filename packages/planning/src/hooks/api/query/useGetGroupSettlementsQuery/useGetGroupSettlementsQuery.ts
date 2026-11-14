import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupSettlements, type Settlement, type SplitGroup } from "../../../../api/splits";
import { splitKeys } from "../../queryKeys";

/**
 * Fetched, refreshed by `useSyncSplitGroupFeed` when the realtime group document changes.
 * With `settlementsCount` 0 there is nothing to read: a just created group is listed before the server has it,
 * and a read then would be denied (#106).
 */
export const useGetGroupSettlementsQuery = (
  group: Pick<SplitGroup, "id" | "settlementsCount"> | undefined,
  options?: Omit<UseQueryOptions<Settlement[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Settlement[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: splitKeys.settlements(group?.id ?? ""),
    queryFn: () => {
      if (!group) throw new Error("planning:errors.splitGroupMissing");
      return group.settlementsCount === 0 ? [] : getGroupSettlements(group.id);
    },
    enabled: !!group,
    ...options,
  });
};
