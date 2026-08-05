import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupInvitations } from '../../../api/groups';
import type { GroupInvitation } from '../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";


const getGroupPendingInvitationsQueryKey = (groupId: string) => ["groupPendingInvitations", groupId];

export const useGetGroupPendingInvitationsQuery = (groupId: string | undefined) => {

  return useQuery<GroupInvitation[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getGroupPendingInvitationsQueryKey(groupId as string),
    queryFn: () => getGroupInvitations(groupId as string),
    enabled: !!groupId,
  });
};

export const useInvalidateGroupPendingInvitationsQuery = () => {
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getGroupPendingInvitationsQueryKey(groupId) });
};

export default useGetGroupPendingInvitationsQuery;
