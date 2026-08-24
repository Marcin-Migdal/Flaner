import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateGroup, type Group } from "../../../api/groups";
import { useInvalidateGroupQuery } from "../query/useGetGroupQuery";
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";
import { useInvalidateSearchGlobalGroupsQuery } from "../query/useSearchGlobalGroupsQuery";

export type UpdateGroupInput = {
  groupId: string;
  data: Partial<Omit<Group, "id" | "createdAt" | "ownerId">>;
};

export const useUpdateGroupMutation = (options?: UseMutationOptions<void, Error, UpdateGroupInput>) => {
  const invalidateGroup = useInvalidateGroupQuery();
  const invalidateUserGroups = useInvalidateUserGroupsQuery();
  const invalidateSearchGlobalGroups = useInvalidateSearchGlobalGroupsQuery();

  return useMutation<void, Error, UpdateGroupInput>({
    meta: {
      successMessageKey: "community:toasts.manageGroupSheet.updateSuccess",
      errorMessageKey: "community:toasts.manageGroupSheet.updateError",
    },
    mutationFn: ({ groupId, data }) => updateGroup(groupId, data),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroup(variables.groupId);
      invalidateUserGroups();
      invalidateSearchGlobalGroups();

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUpdateGroupMutation;

