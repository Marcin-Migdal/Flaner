import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { addLookupColor, type AddLookupColorInput } from "../../../api/lookups";
import { useInvalidateGetLookupColorsQuery } from "../query/useGetLookupColorsQuery";

export const useAddLookupColorMutation = (
  options?: UseMutationOptions<string, Error, AddLookupColorInput>,
) => {
  const { user } = useAuth();
  const invalidateColors = useInvalidateGetLookupColorsQuery();

  return useMutation<string, Error, AddLookupColorInput>({
    mutationFn: async (data: AddLookupColorInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await addLookupColor(user.uid, data);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.addColorSuccess",
      errorMessageKey: "tools:toasts.lookups.addColorError",
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

export default useAddLookupColorMutation;
