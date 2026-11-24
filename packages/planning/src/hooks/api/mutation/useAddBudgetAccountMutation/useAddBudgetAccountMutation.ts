import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addBudgetAccount, type BudgetAccount, type BudgetAccountInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Adds an account. Errors are left to the caller (No connection toast with Retry). */
export const useAddBudgetAccountMutation = (options?: UseMutationOptions<BudgetAccount, Error, BudgetAccountInput>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<BudgetAccount, BudgetAccountInput>(
    {
      mutationKey: ["addBudgetAccount"],
      mutationFn: (input) => addBudgetAccount(budget, input),
      invalidates: budgetInvalidation.accountsChanged,
      meta: { successMessageKey: "planning:toasts.budget.accountAdded", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
