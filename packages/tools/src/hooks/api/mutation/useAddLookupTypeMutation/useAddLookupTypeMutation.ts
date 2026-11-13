import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addLookupType, type AddLookupTypeInput } from "../../../../api/lookups";
import { spoolerInvalidation } from "../../queryKeys";

export const useAddLookupTypeMutation = (options?: UseMutationOptions<string, Error, AddLookupTypeInput>) =>
  useUserMutation<string, AddLookupTypeInput>(
    {
      mutationKey: ["addLookupType"],
      mutationFn: (data, { uid }) => addLookupType(uid, data),
      invalidates: spoolerInvalidation.addLookupType,
      meta: {
        successMessageKey: "tools:toasts.lookups.addTypeSuccess",
        errorMessageKey: "tools:toasts.lookups.addTypeError",
      },
    },
    options,
  );

export default useAddLookupTypeMutation;
