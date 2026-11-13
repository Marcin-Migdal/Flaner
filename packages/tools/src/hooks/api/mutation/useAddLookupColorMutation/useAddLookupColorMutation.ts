import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addLookupColor, type AddLookupColorInput } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export const useAddLookupColorMutation = (options?: UseMutationOptions<string, Error, AddLookupColorInput>) =>
  useUserMutation<string, AddLookupColorInput>(
    {
      mutationKey: ["addLookupColor"],
      mutationFn: (data, { uid }) => addLookupColor(uid, data),
      invalidates: spoolerInvalidation.addLookupColor,
      meta: {
        successMessageKey: "tools:toasts.lookups.addColorSuccess",
        errorMessageKey: "tools:toasts.lookups.addColorError",
      },
    },
    options,
  );

export default useAddLookupColorMutation;
