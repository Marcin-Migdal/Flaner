import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateBudgetAccount, type BudgetAccountChanges } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

export type UpdateBudgetAccountVariables = { accountId: string; changes: BudgetAccountChanges };

/** Renames, re-currencies, hides or shows an account. Errors are left to the caller (No connection toast with Retry). */
export const useUpdateBudgetAccountMutation = (options?: UseMutationOptions<void, Error, UpdateBudgetAccountVariables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, UpdateBudgetAccountVariables>(
    {
      mutationKey: ["updateBudgetAccount"],
      mutationFn: ({ accountId, changes }) => updateBudgetAccount(budget, accountId, changes),
      invalidates: budgetInvalidation.accountsChanged,
      meta: { successMessageKey: "planning:toasts.budget.accountSaved", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
