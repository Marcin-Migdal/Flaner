import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { deleteLookupColor } from "../../../api/lookups";
import { useInvalidateGetLookupColorsQuery } from "../query/useGetLookupColorsQuery";

export const useDeleteLookupColorMutation = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const { user } = useAuth();
  const invalidateColors = useInvalidateGetLookupColorsQuery();

  return useMutation<void, Error, string>({
    mutationFn: async (colorId: string) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await deleteLookupColor(colorId);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.deleteColorSuccess",
      errorMessageKey: "tools:toasts.lookups.deleteColorError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateColors();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteLookupColorMutation;
