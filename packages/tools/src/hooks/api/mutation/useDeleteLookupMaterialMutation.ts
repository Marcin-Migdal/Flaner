import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { deleteLookupMaterial } from "../../../api/lookups";
import { useInvalidateGetLookupMaterialsQuery } from "../query/useGetLookupMaterialsQuery";
import { useInvalidateGetLookupTypesQuery } from "../query/useGetLookupTypesQuery";
import { useInvalidateGetLookupColorsQuery } from "../query/useGetLookupColorsQuery";

export type DeleteLookupMaterialVariables = {
  materialId: string;
  materialName: string;
};

export const useDeleteLookupMaterialMutation = (
  options?: UseMutationOptions<void, Error, DeleteLookupMaterialVariables>,
) => {
  const { user } = useAuth();
  const invalidateMaterials = useInvalidateGetLookupMaterialsQuery();
  const invalidateTypes = useInvalidateGetLookupTypesQuery();
  const invalidateColors = useInvalidateGetLookupColorsQuery();

  return useMutation<void, Error, DeleteLookupMaterialVariables>({
    mutationFn: async ({ materialId, materialName }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await deleteLookupMaterial(user.uid, materialId, materialName);
    },
    meta: {
      successMessageKey: "tools:toasts.lookups.deleteMaterialSuccess",
      errorMessageKey: "tools:toasts.lookups.deleteMaterialError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateMaterials();
      invalidateTypes();
      invalidateColors();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteLookupMaterialMutation;
