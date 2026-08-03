import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { acceptGroupInvitation } from '../../../api/groups';
import { useInvalidateUserGroupInvitationsQuery } from "../query/useGetUserGroupInvitationsQuery";
import { useInvalidateGroupPendingInvitationsQuery } from "../query/useGetGroupPendingInvitationsQuery";
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";

export const useAcceptGroupInvitationMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>
) => {
  const invalidateUserGroupInvitations = useInvalidateUserGroupInvitationsQuery();
  const invalidateGroupPendingInvitations = useInvalidateGroupPendingInvitationsQuery();
  const invalidateGroupMembers = useInvalidateGroupMembersQuery();
  const invalidateUserGroups = useInvalidateUserGroupsQuery();

  return useMutation<void, Error, { groupId: string; userId: string }>({
    mutationFn: ({ groupId, userId }) => acceptGroupInvitation(groupId, userId),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateUserGroupInvitations(variables.userId);
      invalidateGroupPendingInvitations(variables.groupId);
      invalidateGroupMembers(variables.groupId);
      invalidateUserGroups();
      
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAcceptGroupInvitationMutation;
