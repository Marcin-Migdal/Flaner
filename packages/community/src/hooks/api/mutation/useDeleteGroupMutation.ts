import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { deleteGroup } from '../../../api/groups';
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";
import { useInvalidateSearchGlobalGroupsQuery } from "../query/useSearchGlobalGroupsQuery";

export const useDeleteGroupMutation = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const invalidateUserGroups = useInvalidateUserGroupsQuery();
  const invalidateSearchGlobalGroups = useInvalidateSearchGlobalGroupsQuery();

  return useMutation<void, Error, string>({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    ...options,
    onSuccess: async (...args) => {
      invalidateUserGroups();
      invalidateSearchGlobalGroups();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteGroupMutation;
