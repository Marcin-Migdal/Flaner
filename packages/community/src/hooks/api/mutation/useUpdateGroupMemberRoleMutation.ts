import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateGroupMemberRole } from "../../../api/groups";
import type { GroupRole } from "../../../api/types";
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";

export const useUpdateGroupMemberRoleMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string; role: GroupRole }>
) => {
  const invalidateGroupMembers = useInvalidateGroupMembersQuery();

  return useMutation<void, Error, { groupId: string; userId: string; role: GroupRole }>({
    mutationFn: ({ groupId, userId, role }) => updateGroupMemberRole(groupId, userId, role),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroupMembers(variables.groupId);
      
      if (options?.onSuccess) {
        await (options.onSuccess as any)(...args);
      }
    },
  });
};

export default useUpdateGroupMemberRoleMutation;
