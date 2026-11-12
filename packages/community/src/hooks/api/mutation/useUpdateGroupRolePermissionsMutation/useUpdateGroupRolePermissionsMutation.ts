import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateGroupRolePermissions, type RolePermissionsMap } from "../../../../api/groups";

export type UpdateGroupRolePermissionsInput = {
  groupId: string;
  rolePermissions: RolePermissionsMap;
};

export const useUpdateGroupRolePermissionsMutation = (options?: UseMutationOptions<void, Error, UpdateGroupRolePermissionsInput>) =>
  useUserMutation<void, UpdateGroupRolePermissionsInput>(
    {
      mutationKey: ["updateGroupRolePermissions"],
      mutationFn: ({ groupId, rolePermissions }) => updateGroupRolePermissions(groupId, rolePermissions),
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.permissionsUpdateSuccess",
        errorMessageKey: "community:toasts.manageGroupSheet.permissionsUpdateError",
      },
    },
    options,
  );

export default useUpdateGroupRolePermissionsMutation;
