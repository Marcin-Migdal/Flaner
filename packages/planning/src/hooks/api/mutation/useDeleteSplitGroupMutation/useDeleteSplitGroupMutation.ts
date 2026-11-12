import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteSplitGroup } from "../../../../api/splits";

export const useDeleteSplitGroupMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["deleteSplitGroup"],
      mutationFn: async (groupId, user) => {
        await deleteSplitGroup(groupId, user.uid);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.groupDeleteSuccess",
        errorMessageKey: "planning:toasts.splits.groupDeleteError",
      },
    },
    options,
  );

export default useDeleteSplitGroupMutation;
