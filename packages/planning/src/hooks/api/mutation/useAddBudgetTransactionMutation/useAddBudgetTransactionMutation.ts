import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addBudgetTransaction, type BudgetTransaction, type BudgetTransactionInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Adds a transaction to its account's month. Errors are left to the caller (No connection toast with Retry). */
export const useAddBudgetTransactionMutation = (
  options?: UseMutationOptions<BudgetTransaction, Error, BudgetTransactionInput>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetTransaction, BudgetTransactionInput>(
    {
      mutationKey: ["addBudgetTransaction"],
      mutationFn: (input) => addBudgetTransaction(budget, input),
      invalidates: budgetInvalidation.transactionsChanged,
      meta: { successMessageKey: "planning:toasts.budget.transactionAdded", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
