import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteLookupColor } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export const useDeleteLookupColorMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["deleteLookupColor"],
      mutationFn: (colorId) => deleteLookupColor(colorId),
      invalidates: spoolerInvalidation.deleteLookupColor,
      meta: {
        successMessageKey: "tools:toasts.lookups.deleteColorSuccess",
        errorMessageKey: "tools:toasts.lookups.deleteColorError",
      },
    },
    options,
  );

export default useDeleteLookupColorMutation;
