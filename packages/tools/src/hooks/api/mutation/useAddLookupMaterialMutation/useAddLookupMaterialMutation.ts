import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addLookupMaterial, type AddLookupMaterialInput } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export const useAddLookupMaterialMutation = (options?: UseMutationOptions<string, Error, AddLookupMaterialInput>) =>
  useUserMutation<string, AddLookupMaterialInput>(
    {
      mutationKey: ["addLookupMaterial"],
      mutationFn: (data, { uid }) => addLookupMaterial(uid, data),
      invalidates: spoolerInvalidation.addLookupMaterial,
      meta: {
        successMessageKey: "tools:toasts.lookups.addMaterialSuccess",
        errorMessageKey: "tools:toasts.lookups.addMaterialError",
      },
    },
    options,
  );

export default useAddLookupMaterialMutation;
