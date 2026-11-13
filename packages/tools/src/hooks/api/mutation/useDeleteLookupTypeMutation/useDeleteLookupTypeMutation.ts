import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteLookupType } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export type DeleteLookupTypeVariables = {
  materialName: string;
  typeName: string;
};

export const useDeleteLookupTypeMutation = (options?: UseMutationOptions<void, Error, DeleteLookupTypeVariables>) =>
  useUserMutation<void, DeleteLookupTypeVariables>(
    {
      mutationKey: ["deleteLookupType"],
      mutationFn: ({ materialName, typeName }, { uid }) => deleteLookupType(uid, materialName, typeName),
      invalidates: spoolerInvalidation.deleteLookupType,
      meta: {
        successMessageKey: "tools:toasts.lookups.deleteTypeSuccess",
        errorMessageKey: "tools:toasts.lookups.deleteTypeError",
      },
    },
    options,
  );

export default useDeleteLookupTypeMutation;
