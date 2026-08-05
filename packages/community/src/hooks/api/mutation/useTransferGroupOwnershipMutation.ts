import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { transferGroupOwnership } from '../../../api/groups';
import { useInvalidateGroupQuery } from "../query/useGetGroupQuery";
import { useInvalidateGroupMembersQuery } from "../query/useGetGroupMembersQuery";
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";
export const useTransferGroupOwnershipMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; currentOwnerId: string; newOwnerId: string }>
) => {
  const invalidateGroup = useInvalidateGroupQuery();
  const invalidateGroupMembers = useInvalidateGroupMembersQuery();
  const invalidateUserGroups = useInvalidateUserGroupsQuery();



  return useMutation<void, Error, { groupId: string; currentOwnerId: string; newOwnerId: string }>({
    meta: {
      successMessageKey: "community:toasts.manageGroupSheet.transferSuccess",
      errorMessageKey: "errors.mutationError",
    },
    mutationFn: ({ groupId, currentOwnerId, newOwnerId }) => transferGroupOwnership(groupId, currentOwnerId, newOwnerId),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroup(variables.groupId);
      invalidateGroupMembers(variables.groupId);
      invalidateUserGroups();
      
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useTransferGroupOwnershipMutation;
