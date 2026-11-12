import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteLookupMaterial } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export type DeleteLookupMaterialVariables = {
  materialId: string;
  materialName: string;
};

export const useDeleteLookupMaterialMutation = (options?: UseMutationOptions<void, Error, DeleteLookupMaterialVariables>) =>
  useUserMutation<void, DeleteLookupMaterialVariables>(
    {
      mutationKey: ["deleteLookupMaterial"],
      mutationFn: ({ materialId, materialName }, { uid }) => deleteLookupMaterial(uid, materialId, materialName),
      invalidates: spoolerInvalidation.deleteLookupMaterial,
      meta: {
        successMessageKey: "tools:toasts.lookups.deleteMaterialSuccess",
        errorMessageKey: "tools:toasts.lookups.deleteMaterialError",
      },
    },
    options,
  );

export default useDeleteLookupMaterialMutation;
