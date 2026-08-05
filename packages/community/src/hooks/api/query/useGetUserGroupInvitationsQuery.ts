import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUserGroupInvitations, subscribeToUserGroupInvitations } from '../../../api/groups';
import type { GroupInvitation } from '../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";


const getGroupInvitationsQueryKey = (userId: string) => ["groupInvitations", userId];

export const useGetUserGroupInvitationsQuery = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = getGroupInvitationsQueryKey(userId ?? "");

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserGroupInvitations(userId, (invitations: GroupInvitation[]) => {
      queryClient.setQueryData(getGroupInvitationsQueryKey(userId), invitations);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);



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
