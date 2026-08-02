import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { removeGroupMember } from '../../../api/groups';
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";

export const useRemoveGroupMemberMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>
) => {
  const invalidateGroupMembers = useInvalidateGroupMembersQuery();
  const invalidateUserGroups = useInvalidateUserGroupsQuery();

  return useMutation<void, Error, { groupId: string; userId: string }>({
    mutationFn: ({ groupId, userId }) => removeGroupMember(groupId, userId),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroupMembers(variables.groupId);
      invalidateUserGroups();
      

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRemoveGroupMemberMutation;
