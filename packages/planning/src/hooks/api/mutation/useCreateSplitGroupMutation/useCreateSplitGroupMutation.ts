import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createSplitGroup, type CreateSplitGroupInput, type SplitGroup } from "../../../../api/splits";

export const useCreateSplitGroupMutation = (
  options?: UseMutationOptions<SplitGroup, Error, CreateSplitGroupInput>,
) => {
  const { user } = useAuth();

  return useMutation<SplitGroup, Error, CreateSplitGroupInput>({
    mutationFn: async (data) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return createSplitGroup(data, user);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.groupCreateSuccess",
      errorMessageKey: "planning:toasts.splits.groupCreateError",
    },
    ...options,
  });
};

export default useCreateSplitGroupMutation;
