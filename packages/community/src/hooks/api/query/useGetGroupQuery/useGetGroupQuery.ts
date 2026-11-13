import { useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getGroup, subscribeToGroup, type Group } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetGroupQuery = (groupId: string, options?: RealtimeQueryOptions<Group | null>) =>
  useRealtimeQuery<Group | null>(
    {
      queryKey: groupKeys.group(groupId),
      queryFn: () => getGroup(groupId),
      subscribe: (onUpdate, onError) => subscribeToGroup(groupId, onUpdate, onError),
      enabled: !!groupId,
    },
    options,
  );

export default useGetGroupQuery;
