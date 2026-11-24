import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { importBudgetTransactions, type BudgetTransaction, type BudgetTransactionInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Adds a statement import's transactions all at once. Errors are left to the caller (No connection toast with Retry). */
export const useImportBudgetTransactionsMutation = (
  options?: UseMutationOptions<BudgetTransaction[], Error, BudgetTransactionInput[]>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetTransaction[], BudgetTransactionInput[]>(
    {
      mutationKey: ["importBudgetTransactions"],
      mutationFn: (inputs) => importBudgetTransactions(budget, inputs),
      invalidates: budgetInvalidation.transactionsImported,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
