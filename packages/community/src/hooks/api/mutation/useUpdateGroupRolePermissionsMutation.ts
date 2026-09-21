import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateGroupRolePermissions, type RolePermissionsMap } from "../../../api/groups";
import { useInvalidateGroupQuery } from "../query/useGetGroupQuery";

export type UpdateGroupRolePermissionsInput = {
  groupId: string;
  rolePermissions: RolePermissionsMap;
};

export const useUpdateGroupRolePermissionsMutation = (
  options?: UseMutationOptions<void, Error, UpdateGroupRolePermissionsInput>
) => {
  const invalidateGroup = useInvalidateGroupQuery();

  return useMutation<void, Error, UpdateGroupRolePermissionsInput>({
    meta: {
      successMessageKey: "community:toasts.manageGroupSheet.permissionsUpdateSuccess",
      errorMessageKey: "community:toasts.manageGroupSheet.permissionsUpdateError",
    },
    mutationFn: ({ groupId, rolePermissions }) => updateGroupRolePermissions(groupId, rolePermissions),
    ...options,
    onSuccess: async (...args) => {
      const [, variables] = args;
      invalidateGroup(variables.groupId);

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUpdateGroupRolePermissionsMutation;
