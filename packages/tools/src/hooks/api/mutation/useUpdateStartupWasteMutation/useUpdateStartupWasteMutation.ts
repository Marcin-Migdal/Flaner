import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateStartupWaste } from "../../../../api/settings";
import { spoolerInvalidation } from "../../queryKeys";

export const useUpdateStartupWasteMutation = (options?: UseMutationOptions<void, Error, number>) =>
  useUserMutation<void, number>(
    {
      mutationKey: ["updateStartupWaste"],
      mutationFn: (waste, { uid }) => updateStartupWaste(uid, waste),
      invalidates: spoolerInvalidation.updateStartupWaste,
      meta: {
        successMessageKey: "tools:toasts.settings.saveSuccess",
        errorMessageKey: "tools:toasts.settings.saveError",
      },
    },
    options,
  );

export default useUpdateStartupWasteMutation;
