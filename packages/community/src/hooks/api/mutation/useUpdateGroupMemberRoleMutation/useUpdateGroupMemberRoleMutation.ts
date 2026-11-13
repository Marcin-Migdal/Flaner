import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateGroupMemberRole } from '../../../../api/groups';
import type { GroupRole } from '../../../../api/groups';

export const useUpdateGroupMemberRoleMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string; role: GroupRole }>) =>
  useUserMutation<void, { groupId: string; userId: string; role: GroupRole }>(
    {
      mutationKey: ["updateGroupMemberRole"],
      mutationFn: ({ groupId, userId, role }) => updateGroupMemberRole(groupId, userId, role),
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.roleUpdateSuccess",
        errorMessageKey: "errors.mutationError",
      },
    },
    options,
  );

export default useUpdateGroupMemberRoleMutation;
