import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { deleteSplitGroup } from "../../../../api/splits";

export const useDeleteSplitGroupMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await deleteSplitGroup(groupId, user.uid);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.groupDeleteSuccess",
      errorMessageKey: "planning:toasts.splits.groupDeleteError",
    },
    ...options,
  });
};

export default useDeleteSplitGroupMutation;
