import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroupInvitations, subscribeToUserGroupInvitations } from "../../../api/groups";
import type { GroupInvitation } from "../../../api/types";

const getGroupInvitationsQueryKey = (userId: string) => ["groupInvitations", userId];

export const useGetUserGroupInvitationsQuery = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = getGroupInvitationsQueryKey(userId ?? "");

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserGroupInvitations(userId, (invitations: GroupInvitation[]) => {
      queryClient.setQueryData(queryKey, invitations);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery<GroupInvitation[], Error>({
    queryKey,
    queryFn: () => (userId ? getUserGroupInvitations(userId) : []),
    enabled: !!userId,
    staleTime: Infinity,
  });
};

export const useInvalidateUserGroupInvitationsQuery = () => {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.invalidateQueries({ queryKey: getGroupInvitationsQueryKey(userId) });
};

export default useGetUserGroupInvitationsQuery;
