import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetTransaction, type BudgetTransactionRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Deletes a transaction from its month. Errors are left to the caller (No connection toast with Retry). */
export const useDeleteBudgetTransactionMutation = (options?: UseMutationOptions<void, Error, BudgetTransactionRef>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, BudgetTransactionRef>(
    {
      mutationKey: ["deleteBudgetTransaction"],
      mutationFn: (ref) => deleteBudgetTransaction(budget, ref),
      // A linked refund on the other side is cleaned up too, possibly in another month
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { successMessageKey: "planning:toasts.budget.transactionDeleted", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
