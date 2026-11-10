import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupMembers, subscribeToGroupMembers } from '../../../../api/groups';
import type { GroupMember } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getGroupMembersQueryKeys = (groupId: string) => ["groupMembers", groupId];

export const useGetGroupMembersQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<GroupMember[], Error>, "queryKey" | "queryFn">,
) => {
  useRealtimeQueryData<GroupMember[]>(
    getGroupMembersQueryKeys(groupId),
    (onUpdate, onError) => subscribeToGroupMembers(groupId, onUpdate, onError),
    !!groupId && options?.enabled !== false,
  );

  return useQuery<GroupMember[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupMembersQueryKeys(groupId),
    queryFn: () => getGroupMembers(groupId),
    enabled: !!groupId,
    staleTime: Infinity, // the listener keeps it fresh
    ...options,
  });
};

export const useInvalidateGroupMembersQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupMembersQueryKeys(groupId) });
};

export default useGetGroupMembersQuery;
