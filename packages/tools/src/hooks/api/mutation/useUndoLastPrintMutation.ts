import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { undoLastPrint, type UndoPrintInput } from "../../../api/spools";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";
import { useInvalidateGetSpoolPrintsQuery } from "../query/useGetSpoolPrintsQuery";

export const useUndoLastPrintMutation = (
  options?: UseMutationOptions<void, Error, UndoPrintInput>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();
  const invalidatePrints = useInvalidateGetSpoolPrintsQuery();

  return useMutation<void, Error, UndoPrintInput>({
    mutationFn: async (input: UndoPrintInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await undoLastPrint(input.spoolId, input.printId, input.usedWeight);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.undoSuccess",
      errorMessageKey: "tools:toasts.spools.undoError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateSpools();
      invalidatePrints(args[1].spoolId);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUndoLastPrintMutation;
