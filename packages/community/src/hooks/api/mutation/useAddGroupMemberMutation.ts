import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { addGroupMember } from '../../../api/groups';
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";
import { reactQueryMeta } from "@flaner/shared/constants";


export const useAddGroupMemberMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>,
  invalidateUserGroups?: boolean,
) => {
  const invalidateMembers = useInvalidateGroupMembersQuery();
  const invalidateGroups = useInvalidateUserGroupsQuery();



  return useMutation<void, Error, { groupId: string; userId: string }>({
    meta: reactQueryMeta.mutate,
    mutationFn: async ({ groupId, userId }) => {
      await addGroupMember(groupId, userId, "member");
    },
    ...options,
    onSuccess: async (...args) => {
      const [_data, variables] = args;
      invalidateMembers(variables.groupId);

      if (invalidateUserGroups) {
        invalidateGroups();
      }

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAddGroupMemberMutation;
