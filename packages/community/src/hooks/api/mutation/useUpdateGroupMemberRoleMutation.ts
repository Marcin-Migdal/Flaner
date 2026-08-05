import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateGroupMemberRole } from '../../../api/groups';
import type { GroupRole } from '../../../api/groups';
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";
export const useUpdateGroupMemberRoleMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string; role: GroupRole }>,
) => {
  const invalidateGroupMembers = useInvalidateGroupMembersQuery();



  return useMutation<void, Error, { groupId: string; userId: string; role: GroupRole }>({
    meta: {
      successMessageKey: "community:toasts.manageGroupSheet.roleUpdateSuccess",
      errorMessageKey: "errors.mutationError",
    },
    mutationFn: ({ groupId, userId, role }) => updateGroupMemberRole(groupId, userId, role),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroupMembers(variables.groupId);

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUpdateGroupMemberRoleMutation;
