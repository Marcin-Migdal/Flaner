import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupInvitations, subscribeToGroupInvitations } from '../../../../api/groups';
import type { GroupInvitation } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "../../../useRealtimeQueryData";


const getGroupPendingInvitationsQueryKey = (groupId: string) => ["groupPendingInvitations", groupId];

export const useGetGroupPendingInvitationsQuery = (groupId: string | undefined) => {
  useRealtimeQueryData<GroupInvitation[]>(
    getGroupPendingInvitationsQueryKey(groupId ?? ""),
    (onUpdate) => subscribeToGroupInvitations(groupId ?? "", onUpdate),
    !!groupId,
  );

  return useQuery<GroupInvitation[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupPendingInvitationsQueryKey(groupId ?? ""),
    queryFn: () => getGroupInvitations(groupId ?? ""),
    enabled: !!groupId,
    staleTime: Infinity, // the listener keeps it fresh
  });
};

export const useInvalidateGroupPendingInvitationsQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupPendingInvitationsQueryKey(groupId) });
};

export default useGetGroupPendingInvitationsQuery;
