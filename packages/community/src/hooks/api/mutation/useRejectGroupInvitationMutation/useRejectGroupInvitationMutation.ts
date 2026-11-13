import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { rejectGroupInvitation } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";

export const useRejectGroupInvitationMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["rejectGroupInvitation"],
      mutationFn: ({ groupId, userId }) => rejectGroupInvitation(groupId, userId),
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useRejectGroupInvitationMutation;
