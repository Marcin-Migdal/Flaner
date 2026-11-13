import { useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getGroupRequests, subscribeToGroupRequests, type GroupRequest } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetGroupRequestsQuery = (groupId: string, options?: RealtimeQueryOptions<GroupRequest[]>) =>
  useRealtimeQuery<GroupRequest[]>(
    {
      queryKey: groupKeys.requests(groupId),
      queryFn: () => getGroupRequests(groupId),
      subscribe: (onUpdate, onError) => subscribeToGroupRequests(groupId, onUpdate, onError),
      enabled: !!groupId,
    },
    options,
  );

export default useGetGroupRequestsQuery;
