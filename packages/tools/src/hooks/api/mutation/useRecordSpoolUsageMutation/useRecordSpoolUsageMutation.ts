import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { recordSpoolUsage, type RecordUsageInput, type RecordUsageResult } from "../../../../api/spools";
import { spoolerInvalidation } from "../../queryKeys";

export const useRecordSpoolUsageMutation = (options?: UseMutationOptions<RecordUsageResult, Error, RecordUsageInput>) =>
  useUserMutation<RecordUsageResult, RecordUsageInput>(
    {
      mutationKey: ["recordSpoolUsage"],
      mutationFn: ({ spoolId, usage }) => recordSpoolUsage(spoolId, usage),
      invalidates: spoolerInvalidation.recordSpoolUsage,
      meta: {
        successMessageKey: "tools:toasts.spools.recordUsageSuccess",
        errorMessageKey: "tools:toasts.spools.recordUsageError",
      },
    },
    options,
  );

export default useRecordSpoolUsageMutation;
