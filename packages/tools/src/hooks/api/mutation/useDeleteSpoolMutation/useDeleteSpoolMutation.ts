import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteSpool } from "../../../../api/spools";
import { spoolerInvalidation } from "../../queryKeys";

export const useDeleteSpoolMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["deleteSpool"],
      mutationFn: (spoolId) => deleteSpool(spoolId),
      invalidates: spoolerInvalidation.deleteSpool,
      meta: {
        successMessageKey: "tools:toasts.spools.deleteSuccess",
        errorMessageKey: "tools:toasts.spools.deleteError",
      },
    },
    options,
  );

export default useDeleteSpoolMutation;
