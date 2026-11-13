import { useRealtimeQuery } from "@flaner/shared/hooks";
import { getGroupInvitations, subscribeToGroupInvitations, type GroupInvitation } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetGroupPendingInvitationsQuery = (groupId: string | undefined) =>
  useRealtimeQuery<GroupInvitation[]>({
    queryKey: groupKeys.pendingInvitations(groupId ?? ""),
    queryFn: () => getGroupInvitations(groupId ?? ""),
    subscribe: (onUpdate, onError) => subscribeToGroupInvitations(groupId ?? "", onUpdate, onError),
    enabled: !!groupId,
  });

export default useGetGroupPendingInvitationsQuery;
