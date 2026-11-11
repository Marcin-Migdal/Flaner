import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { undoLastPrint, type UndoPrintInput } from "../../../../api/spools";
import { spoolerInvalidation } from "../../queryKeys";

export const useUndoLastPrintMutation = (options?: UseMutationOptions<void, Error, UndoPrintInput>) =>
  useUserMutation<void, UndoPrintInput>(
    {
      mutationKey: ["undoLastPrint"],
      mutationFn: ({ spoolId, printId }) => undoLastPrint(spoolId, printId),
      invalidates: spoolerInvalidation.undoLastPrint,
      meta: {
        successMessageKey: "tools:toasts.spools.undoSuccess",
        errorMessageKey: "tools:toasts.spools.undoError",
      },
    },
    options,
  );

export default useUndoLastPrintMutation;
