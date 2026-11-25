import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateBudgetTransactions, type BudgetTransaction, type BudgetTransactionUpdate } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/**
 * Edits one or many transactions (inline edit, edit dialog, bulk set category / confirm); a new date or account
 * moves the transaction atomically; a set or changed category teaches a rule. No success toast: the list shows the change. Errors are left to the caller.
 */
export const useUpdateBudgetTransactionsMutation = (
  options?: UseMutationOptions<BudgetTransaction[], Error, BudgetTransactionUpdate[]>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetTransaction[], BudgetTransactionUpdate[]>(
    {
      mutationKey: ["updateBudgetTransactions"],
      mutationFn: (updates) => updateBudgetTransactions(budget, updates),
      invalidates: (user, updates) =>
        budgetInvalidation.transactionsEdited(
          user,
          updates.flatMap(({ ref, patch }) => [ref.date, patch.date ?? ref.date]),
        ),
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
