import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { inviteUserToGroup } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";

export type InviteUserToGroupInput = {
  groupId: string;
  groupName: string;
  userId: string;
  invitedByUserId: string;
  groupAvatarUrl?: string | null;
};

export const useInviteUserToGroupMutation = (options?: UseMutationOptions<void, Error, InviteUserToGroupInput>) =>
  useUserMutation<void, InviteUserToGroupInput>(
    {
      mutationKey: ["inviteUserToGroup"],
      mutationFn: ({ groupId, groupName, userId, invitedByUserId, groupAvatarUrl }) =>
        inviteUserToGroup(groupId, groupName, userId, invitedByUserId, groupAvatarUrl),
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useInviteUserToGroupMutation;
