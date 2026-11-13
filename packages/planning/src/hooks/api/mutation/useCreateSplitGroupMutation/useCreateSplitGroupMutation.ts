import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createSplitGroup, type CreateSplitGroupInput, type SplitGroup } from "../../../../api/splits";

export const useCreateSplitGroupMutation = (options?: UseMutationOptions<SplitGroup, Error, CreateSplitGroupInput>) =>
  useUserMutation<SplitGroup, CreateSplitGroupInput>(
    {
      mutationKey: ["createSplitGroup"],
      mutationFn: async (data, user) => {
        return createSplitGroup(data, user);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.groupCreateSuccess",
        errorMessageKey: "planning:toasts.splits.groupCreateError",
      },
    },
    options,
  );

export default useCreateSplitGroupMutation;
