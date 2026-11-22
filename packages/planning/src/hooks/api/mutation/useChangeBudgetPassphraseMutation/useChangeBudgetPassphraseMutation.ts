import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { changeBudgetPassphrase, type UnlockedBudget } from "../../../../api/budget";
import { budgetInvalidation } from "../../queryKeys";

export type ChangeBudgetPassphraseVariables = {
  /** Unlocked by the current passphrase or the recovery key (a remembered device's key cannot be re-wrapped). */
  budget: UnlockedBudget;
  passphrase: string;
};

/** Re-wraps the user key by a new passphrase; no budget data is re-encrypted. */
export const useChangeBudgetPassphraseMutation = (
  options?: UseMutationOptions<void, Error, ChangeBudgetPassphraseVariables>,
) =>
  useUserMutation<void, ChangeBudgetPassphraseVariables>(
    {
      mutationKey: ["changeBudgetPassphrase"],
      mutationFn: ({ budget, passphrase }) => changeBudgetPassphrase(budget, passphrase),
      invalidates: budgetInvalidation.rewrapKeys,
      meta: {
        successMessageKey: "planning:toasts.budget.passphraseChangeSuccess",
        errorMessageKey: "planning:toasts.budget.passphraseChangeError",
      },
    },
    options,
  );
