import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateSplitGroup, type UpdateSplitGroupInput } from "../../../../api/splits";

export type UpdateSplitGroupParams = {
  groupId: string;
  data: UpdateSplitGroupInput;
};

export const useUpdateSplitGroupMutation = (options?: UseMutationOptions<void, Error, UpdateSplitGroupParams>) =>
  useUserMutation<void, UpdateSplitGroupParams>(
    {
      mutationKey: ["updateSplitGroup"],
      mutationFn: async ({ groupId, data }) => {
        await updateSplitGroup(groupId, data);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.groupUpdateSuccess",
        errorMessageKey: "planning:toasts.splits.groupUpdateError",
      },
    },
    options,
  );

export default useUpdateSplitGroupMutation;
