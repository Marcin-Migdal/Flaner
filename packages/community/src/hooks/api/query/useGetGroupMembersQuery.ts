import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroupMembers } from '../../../api/groups';
import type { GroupMember } from '../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";


const getGroupMembersQueryKeys = (groupId: string) => ["groupMembers", groupId];

export const useGetGroupMembersQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<GroupMember[], Error>, "queryKey" | "queryFn">,
) => {

  return useQuery<GroupMember[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupMembersQueryKeys(groupId),
    queryFn: () => getGroupMembers(groupId),
    enabled: !!groupId,
    ...options,
  });
};

export const useInvalidateGroupMembersQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupMembersQueryKeys(groupId) });
};

export default useGetGroupMembersQuery;
