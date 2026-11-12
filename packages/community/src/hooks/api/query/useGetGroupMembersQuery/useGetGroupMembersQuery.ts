import { useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getGroupMembers, subscribeToGroupMembers, type GroupMember } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetGroupMembersQuery = (groupId: string, options?: RealtimeQueryOptions<GroupMember[]>) =>
  useRealtimeQuery<GroupMember[]>(
    {
      queryKey: groupKeys.members(groupId),
      queryFn: () => getGroupMembers(groupId),
      subscribe: (onUpdate, onError) => subscribeToGroupMembers(groupId, onUpdate, onError),
      enabled: !!groupId,
    },
    options,
  );

export default useGetGroupMembersQuery;
