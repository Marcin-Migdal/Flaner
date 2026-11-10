import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroup, subscribeToGroup } from '../../../../api/groups';
import type { Group } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getGroupQueryKeys = (groupId: string) => ["group", groupId];

export const useGetGroupQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<Group | null, Error>, "queryKey" | "queryFn">,
) => {
  useRealtimeQueryData<Group | null>(
    getGroupQueryKeys(groupId),
    (onUpdate, onError) => subscribeToGroup(groupId, onUpdate, onError),
    !!groupId && options?.enabled !== false,
  );

  return useQuery<Group | null, Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupQueryKeys(groupId),
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
    staleTime: Infinity, // the listener keeps it fresh
    ...options,
  });
};

export const useInvalidateGroupQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupQueryKeys(groupId) });
};

export default useGetGroupQuery;
