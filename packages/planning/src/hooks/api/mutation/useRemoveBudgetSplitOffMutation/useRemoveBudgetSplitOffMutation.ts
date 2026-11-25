import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { removeBudgetSplitOff, type BudgetTransactionRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type Variables = { ref: BudgetTransactionRef; splitOffId: string };

/** Removes a split-off (a refund split-off unlinks its refund). No success toast: the list shows the change. Errors are left to the caller. */
export const useRemoveBudgetSplitOffMutation = (options?: UseMutationOptions<void, Error, Variables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, Variables>(
    {
      mutationKey: ["removeBudgetSplitOff"],
      mutationFn: ({ ref, splitOffId }) => removeBudgetSplitOff(budget, ref, splitOffId),
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
