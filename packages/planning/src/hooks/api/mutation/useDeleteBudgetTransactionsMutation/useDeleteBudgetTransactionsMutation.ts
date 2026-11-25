import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetTransactions, type BudgetTransactionRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Deletes the selected transactions in one write (bulk Delete). Errors are left to the caller. */
export const useDeleteBudgetTransactionsMutation = (options?: UseMutationOptions<void, Error, BudgetTransactionRef[]>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, BudgetTransactionRef[]>(
    {
      mutationKey: ["deleteBudgetTransactions"],
      mutationFn: (refs) => deleteBudgetTransactions(budget, refs),
      // A linked refund on the other side is cleaned up too, possibly in another month
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { successMessageKey: "planning:toasts.budget.transactionsDeleted", skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
