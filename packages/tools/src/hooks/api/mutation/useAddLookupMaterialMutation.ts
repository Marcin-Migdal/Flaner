import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { addLookupMaterial, type AddLookupMaterialInput } from "../../../api/lookups";
import { useInvalidateGetLookupMaterialsQuery } from "../query/useGetLookupMaterialsQuery";

export const useAddLookupMaterialMutation = (
  options?: UseMutationOptions<string, Error, AddLookupMaterialInput>,
) => {
  const { user } = useAuth();
  const invalidateMaterials = useInvalidateGetLookupMaterialsQuery();

  return useMutation<string, Error, AddLookupMaterialInput>({
    mutationFn: async (data: AddLookupMaterialInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await addLookupMaterial(user.uid, data);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.addMaterialSuccess",
      errorMessageKey: "tools:toasts.lookups.addMaterialError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateMaterials();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAddLookupMaterialMutation;
