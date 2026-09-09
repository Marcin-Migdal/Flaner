import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { deleteSpool } from "../../../api/spools";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export const useDeleteSpoolMutation = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<void, Error, string>({
    mutationFn: async (spoolId: string) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await deleteSpool(spoolId);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.deleteSuccess",
      errorMessageKey: "tools:toasts.spools.deleteError",
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

export default useDeleteSpoolMutation;
