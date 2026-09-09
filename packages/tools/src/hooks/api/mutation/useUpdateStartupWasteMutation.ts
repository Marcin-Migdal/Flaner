import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { updateStartupWaste } from "../../../api/settings";
import { useInvalidateGetStartupWasteQuery } from "../query/useGetStartupWasteQuery";

export const useUpdateStartupWasteMutation = (
  options?: UseMutationOptions<void, Error, number>,
) => {
  const { user } = useAuth();
  const invalidateStartupWaste = useInvalidateGetStartupWasteQuery();

  return useMutation<void, Error, number>({
    mutationFn: async (waste: number) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await updateStartupWaste(user.uid, waste);
    },
    meta: {
      successMessageKey: "tools:toasts.settings.saveSuccess",
      errorMessageKey: "tools:toasts.settings.saveError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateStartupWaste();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUpdateStartupWasteMutation;
