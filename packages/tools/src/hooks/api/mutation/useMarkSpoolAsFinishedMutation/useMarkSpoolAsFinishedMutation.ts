import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { markSpoolAsFinished } from "../../../../api/spools";
import { spoolerInvalidation } from "../../queryKeys";

export const useMarkSpoolAsFinishedMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["markSpoolAsFinished"],
      mutationFn: (spoolId) => markSpoolAsFinished(spoolId),
      invalidates: spoolerInvalidation.markSpoolAsFinished,
      meta: {
        successMessageKey: "tools:toasts.spools.markFinishedSuccess",
        errorMessageKey: "tools:toasts.spools.markFinishedError",
      },
    },
    options,
  );

export default useMarkSpoolAsFinishedMutation;
