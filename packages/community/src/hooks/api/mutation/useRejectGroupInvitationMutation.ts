import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { rejectGroupInvitation } from '../../../api/groups';
import { useInvalidateUserGroupInvitationsQuery } from "../query/useGetUserGroupInvitationsQuery";
import { useInvalidateGroupPendingInvitationsQuery } from "../query/useGetGroupPendingInvitationsQuery";
import { reactQueryMeta } from "@flaner/shared/constants";


export const useRejectGroupInvitationMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>
) => {
  const invalidateUserGroupInvitations = useInvalidateUserGroupInvitationsQuery();
  const invalidateGroupPendingInvitations = useInvalidateGroupPendingInvitationsQuery();



  return useMutation<void, Error, { groupId: string; userId: string }>({
    meta: reactQueryMeta.mutate,
    mutationFn: ({ groupId, userId }) => rejectGroupInvitation(groupId, userId),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateUserGroupInvitations(variables.userId);
      invalidateGroupPendingInvitations(variables.groupId);
      
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRejectGroupInvitationMutation;
