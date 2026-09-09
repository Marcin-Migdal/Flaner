import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { recordSpoolUsage, type RecordUsageInput, type RecordUsageResult } from "../../../api/spools";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";
import { useInvalidateGetSpoolPrintsQuery } from "../query/useGetSpoolPrintsQuery";

export const useRecordSpoolUsageMutation = (
  options?: UseMutationOptions<RecordUsageResult, Error, RecordUsageInput>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();
  const invalidatePrints = useInvalidateGetSpoolPrintsQuery();

  return useMutation<RecordUsageResult, Error, RecordUsageInput>({
    mutationFn: async (input: RecordUsageInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await recordSpoolUsage(input.spool, input.usage);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.recordUsageSuccess",
      errorMessageKey: "tools:toasts.spools.recordUsageError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateSpools();
      invalidatePrints(args[1].spool.id);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRecordSpoolUsageMutation;
