import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { inviteUserToGroup } from "../../../api/groups";
import { useInvalidateUserGroupInvitationsQuery } from "../query/useGetUserGroupInvitationsQuery";
import { useInvalidateGroupPendingInvitationsQuery } from "../query/useGetGroupPendingInvitationsQuery";

export const useInviteUserToGroupMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; groupName: string; userId: string; invitedByUserId: string; groupAvatarUrl?: string | null }>
) => {
  const invalidateUserGroupInvitations = useInvalidateUserGroupInvitationsQuery();
  const invalidateGroupPendingInvitations = useInvalidateGroupPendingInvitationsQuery();

  return useMutation<
    void,
    Error,
    { groupId: string; groupName: string; userId: string; invitedByUserId: string; groupAvatarUrl?: string | null }
  >({
    mutationFn: ({ groupId, groupName, userId, invitedByUserId, groupAvatarUrl }) =>
      inviteUserToGroup(groupId, groupName, userId, invitedByUserId, groupAvatarUrl),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateUserGroupInvitations(variables.userId);
      invalidateGroupPendingInvitations(variables.groupId);
      if (options?.onSuccess) {
        await (options.onSuccess as any)(...args);
      }
    },
  });
};

export default useInviteUserToGroupMutation;
