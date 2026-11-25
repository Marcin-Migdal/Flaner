import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { rememberFileAccountMappings } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import type { FileAccountTargets } from "../../../../utils/statementImport";
import { budgetInvalidation } from "../../queryKeys";

/** Remembers an import's bank account → Flaner account mapping in the profile. Silent: the import itself already succeeded. */
export const useRememberFileAccountMappingsMutation = (
  options?: UseMutationOptions<void, Error, FileAccountTargets>,
) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, FileAccountTargets>(
    {
      mutationKey: ["rememberFileAccountMappings"],
      mutationFn: (mappings) => rememberFileAccountMappings(budget, mappings),
      invalidates: budgetInvalidation.profileChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
