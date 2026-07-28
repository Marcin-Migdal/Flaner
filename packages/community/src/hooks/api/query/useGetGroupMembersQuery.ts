import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import type { GroupMember } from "../../../api/types";
import { getGroupMembers } from "../../../api/groups";

const getGroupMembersQueryKeys = (groupId: string) => ["groupMembers", groupId];

export const useGetGroupMembersQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<GroupMember[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<GroupMember[], Error>({
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
