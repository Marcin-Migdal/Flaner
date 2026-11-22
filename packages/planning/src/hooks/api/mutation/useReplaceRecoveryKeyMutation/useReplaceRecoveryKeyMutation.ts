import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { replaceRecoveryKey, type UnlockedBudget } from "../../../../api/budget";
import { budgetInvalidation } from "../../queryKeys";

export type ReplaceRecoveryKeyVariables = {
  /** Unlocked by the current passphrase (a remembered device's key cannot be re-wrapped). */
  budget: UnlockedBudget;
  recoveryKey: string;
};

/** Wraps the user key by a new recovery key; the old one stops working. */
export const useReplaceRecoveryKeyMutation = (options?: UseMutationOptions<void, Error, ReplaceRecoveryKeyVariables>) =>
  useUserMutation<void, ReplaceRecoveryKeyVariables>(
    {
      mutationKey: ["replaceRecoveryKey"],
      mutationFn: ({ budget, recoveryKey }) => replaceRecoveryKey(budget, recoveryKey),
      invalidates: budgetInvalidation.rewrapKeys,
      meta: {
        successMessageKey: "planning:toasts.budget.recoveryKeySuccess",
        errorMessageKey: "planning:toasts.budget.recoveryKeyError",
      },
    },
    options,
  );
