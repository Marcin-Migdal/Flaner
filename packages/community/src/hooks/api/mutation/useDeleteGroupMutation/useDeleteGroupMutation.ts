import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteGroup } from '../../../../api/groups';
import { groupInvalidation } from "../../queryKeys";

export const useDeleteGroupMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["deleteGroup"],
      mutationFn: (groupId: string) => deleteGroup(groupId),
      invalidates: groupInvalidation.deleteGroup,
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.deleteSuccess",
        errorMessageKey: "community:toasts.manageGroupSheet.deleteError",
      },
    },
    options,
  );

export default useDeleteGroupMutation;
