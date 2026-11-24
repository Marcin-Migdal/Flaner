import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { rememberFileAccountMappings, type BudgetProfile } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type FileAccountMappings = BudgetProfile["fileAccountMappings"];

/** Remembers an import's bank account → Flaner account mapping in the profile. Silent: the import itself already succeeded. */
export const useRememberFileAccountMappingsMutation = (
  options?: UseMutationOptions<void, Error, FileAccountMappings>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, FileAccountMappings>(
    {
      mutationKey: ["rememberFileAccountMappings"],
      mutationFn: (mappings) => rememberFileAccountMappings(budget, mappings),
      invalidates: budgetInvalidation.profileChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
