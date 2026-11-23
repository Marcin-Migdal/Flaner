import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { setBudgetMainCurrency } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Changes the main currency (only before the first transaction). Errors are left to the caller (No connection toast with Retry). */
export const useSetBudgetMainCurrencyMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, string>(
    {
      mutationKey: ["setBudgetMainCurrency"],
      mutationFn: (currency) => setBudgetMainCurrency(budget, currency),
      invalidates: budgetInvalidation.profileChanged,
      meta: { successMessageKey: "planning:toasts.budget.mainCurrencyChanged", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
