import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateSplitGroup, type UpdateSplitGroupInput } from "../../../../api/splits";

export type UpdateSplitGroupParams = {
  groupId: string;
  data: UpdateSplitGroupInput;
};

export const useUpdateSplitGroupMutation = (options?: UseMutationOptions<void, Error, UpdateSplitGroupParams>) => {
  const { user } = useAuth();

  return useMutation<void, Error, UpdateSplitGroupParams>({
    mutationFn: async ({ groupId, data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await updateSplitGroup(groupId, data);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.groupUpdateSuccess",
      errorMessageKey: "planning:toasts.splits.groupUpdateError",
    },
    ...options,
  });
};

export default useUpdateSplitGroupMutation;
