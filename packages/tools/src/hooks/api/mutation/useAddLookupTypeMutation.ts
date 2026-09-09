import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { addLookupType, type AddLookupTypeInput } from "../../../api/lookups";
import { useInvalidateGetLookupTypesQuery } from "../query/useGetLookupTypesQuery";

export const useAddLookupTypeMutation = (
  options?: UseMutationOptions<string, Error, AddLookupTypeInput>,
) => {
  const { user } = useAuth();
  const invalidateTypes = useInvalidateGetLookupTypesQuery();

  return useMutation<string, Error, AddLookupTypeInput>({
    mutationFn: async (data: AddLookupTypeInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await addLookupType(user.uid, data);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.addTypeSuccess",
      errorMessageKey: "tools:toasts.lookups.addTypeError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateTypes();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAddLookupTypeMutation;
