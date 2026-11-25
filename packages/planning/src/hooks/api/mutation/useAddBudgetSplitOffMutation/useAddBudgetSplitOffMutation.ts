import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addBudgetSplitOff, type BudgetSplitOff, type BudgetSplitOffInput, type BudgetTransactionRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type Variables = { ref: BudgetTransactionRef; input: BudgetSplitOffInput };

/** Splits off part of a transaction (split-off dialog). No success toast: the list shows the change. Errors are left to the caller. */
export const useAddBudgetSplitOffMutation = (options?: UseMutationOptions<BudgetSplitOff, Error, Variables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetSplitOff, Variables>(
    {
      mutationKey: ["addBudgetSplitOff"],
      mutationFn: ({ ref, input }) => addBudgetSplitOff(budget, ref, input),
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
