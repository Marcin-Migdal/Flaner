import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createBudget, type CreateBudgetInput, type UnlockedBudget } from "../../../../api/budget";
import { budgetInvalidation } from "../../queryKeys";

/** Budget onboarding: resolves with the unlocked budget, which the caller keeps in the Budget context. */
export const useCreateBudgetMutation = (options?: UseMutationOptions<UnlockedBudget, Error, CreateBudgetInput>) =>
  useUserMutation<UnlockedBudget, CreateBudgetInput>(
    {
      mutationKey: ["createBudget"],
      mutationFn: (input, { uid }) => createBudget(uid, input),
      invalidates: budgetInvalidation.createBudget,
      meta: {
        successMessageKey: "planning:toasts.budget.setupSuccess",
        errorMessageKey: "planning:toasts.budget.setupError",
      },
    },
    options,
  );
