import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupRequests, subscribeToGroupRequests } from '../../../../api/groups';
import type { GroupRequest } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "../../../useRealtimeQueryData";


const getGroupRequestsQueryKeys = (groupId: string) => ["groupRequests", groupId];

export const useGetGroupRequestsQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<GroupRequest[], Error>, "queryKey" | "queryFn">,
) => {
  useRealtimeQueryData<GroupRequest[]>(
    getGroupRequestsQueryKeys(groupId),
    (onUpdate) => subscribeToGroupRequests(groupId, onUpdate),
    !!groupId && options?.enabled !== false,
  );

  return useQuery<GroupRequest[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupRequestsQueryKeys(groupId),
    queryFn: () => getGroupRequests(groupId),
    enabled: !!groupId,
    staleTime: Infinity, // the listener keeps it fresh
    ...options,
  });
};

export const useInvalidateGroupRequestsQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupRequestsQueryKeys(groupId) });
};

export default useGetGroupRequestsQuery;
