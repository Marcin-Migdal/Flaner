import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroupInvitations, subscribeToUserGroupInvitations } from '../../../../api/groups';
import type { GroupInvitation } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getGroupInvitationsQueryKey = (userId: string) => ["groupInvitations", userId];

export const useGetUserGroupInvitationsQuery = (userId: string | undefined) => {
  const queryKey = getGroupInvitationsQueryKey(userId ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToUserGroupInvitations(userId ?? "", onUpdate, onError),
    !!userId,
  );



  return useQuery<GroupInvitation[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!userId) throw new Error("errors.userNotAuthenticated");
      return getUserGroupInvitations(userId);
    },
    enabled: !!userId,
    staleTime: Infinity,
  });
};

export const useInvalidateUserGroupInvitationsQuery = () => {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.invalidateQueries({ queryKey: getGroupInvitationsQueryKey(userId) });
};

export default useGetUserGroupInvitationsQuery;
