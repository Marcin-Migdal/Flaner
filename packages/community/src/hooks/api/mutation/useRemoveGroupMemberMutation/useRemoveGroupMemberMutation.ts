import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { removeGroupMember } from '../../../../api/groups';

export const useRemoveGroupMemberMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["removeGroupMember"],
      mutationFn: ({ groupId, userId }) => removeGroupMember(groupId, userId),
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.removeSuccess",
        errorMessageKey: "errors.mutationError",
      },
    },
    options,
  );

export default useRemoveGroupMemberMutation;
