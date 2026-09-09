import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { deleteLookupType } from "../../../api/lookups";
import { useInvalidateGetLookupTypesQuery } from "../query/useGetLookupTypesQuery";
import { useInvalidateGetLookupColorsQuery } from "../query/useGetLookupColorsQuery";

export type DeleteLookupTypeVariables = {
  typeId: string;
  materialName: string;
  typeName: string;
};

export const useDeleteLookupTypeMutation = (
  options?: UseMutationOptions<void, Error, DeleteLookupTypeVariables>,
) => {
  const { user } = useAuth();
  const invalidateTypes = useInvalidateGetLookupTypesQuery();
  const invalidateColors = useInvalidateGetLookupColorsQuery();

  return useMutation<void, Error, DeleteLookupTypeVariables>({
    mutationFn: async ({ typeId, materialName, typeName }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await deleteLookupType(user.uid, typeId, materialName, typeName);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.deleteTypeSuccess",
      errorMessageKey: "tools:toasts.lookups.deleteTypeError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateTypes();
      invalidateColors();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteLookupTypeMutation;
