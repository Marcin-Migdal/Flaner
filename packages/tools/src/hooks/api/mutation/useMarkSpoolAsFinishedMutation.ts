import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { markSpoolAsFinished } from "../../../api/spools";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export const useMarkSpoolAsFinishedMutation = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<void, Error, string>({
    mutationFn: async (spoolId: string) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await markSpoolAsFinished(spoolId);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.markFinishedSuccess",
      errorMessageKey: "tools:toasts.spools.markFinishedError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateSpools();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useMarkSpoolAsFinishedMutation;
