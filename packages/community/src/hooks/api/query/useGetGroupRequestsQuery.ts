import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import type { GroupRequest } from "../../../api/types";
import { getGroupRequests } from "../../../api/groups";

const getGroupRequestsQueryKeys = (groupId: string) => ["groupRequests", groupId];

export const useGetGroupRequestsQuery = (
  groupId: string,
  options?: Omit<UseQueryOptions<GroupRequest[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<GroupRequest[], Error>({
    queryKey: getGroupRequestsQueryKeys(groupId),
    queryFn: () => getGroupRequests(groupId),
    enabled: !!groupId,
    ...options,
  });
};

export const useInvalidateGroupRequestsQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupRequestsQueryKeys(groupId) });
};

export default useGetGroupRequestsQuery;
