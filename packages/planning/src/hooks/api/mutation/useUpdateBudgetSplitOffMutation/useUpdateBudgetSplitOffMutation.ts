import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateBudgetSplitOff, type BudgetSplitOffPatch, type BudgetTransactionRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type Variables = { ref: BudgetTransactionRef; splitOffId: string; patch: BudgetSplitOffPatch };

/** Edits, excludes or restores a split-off. No success toast: the list shows the change. Errors are left to the caller. */
export const useUpdateBudgetSplitOffMutation = (options?: UseMutationOptions<void, Error, Variables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, Variables>(
    {
      mutationKey: ["updateBudgetSplitOff"],
      mutationFn: ({ ref, splitOffId, patch }) => updateBudgetSplitOff(budget, ref, splitOffId, patch),
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
