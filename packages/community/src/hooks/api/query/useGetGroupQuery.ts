import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getGroup } from '../../../api/groups';
import type { Group } from '../../../api/groups';

const getGroupQueryKeys = (groupId: string) => ["group", groupId];

export const useGetGroupQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<Group | null, Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Group | null, Error>({
    queryKey: getGroupQueryKeys(groupId),
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
    ...options,
  });
};

export const useInvalidateGroupQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupQueryKeys(groupId) });
};

export default useGetGroupQuery;
