import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteLookupColor } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export type DeleteLookupColorVariables = {
  materialName: string;
  typeName: string;
  name: string;
};

export const useDeleteLookupColorMutation = (options?: UseMutationOptions<void, Error, DeleteLookupColorVariables>) =>
  useUserMutation<void, DeleteLookupColorVariables>(
    {
      mutationKey: ["deleteLookupColor"],
      mutationFn: ({ materialName, typeName, name }, { uid }) => deleteLookupColor(uid, materialName, typeName, name),
      invalidates: spoolerInvalidation.deleteLookupColor,
      meta: {
        successMessageKey: "tools:toasts.lookups.deleteColorSuccess",
        errorMessageKey: "tools:toasts.lookups.deleteColorError",
      },
    },
    options,
  );

export default useDeleteLookupColorMutation;
