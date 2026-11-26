import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { saveImportTemplate, type ImportTemplate } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Saves an import template in the profile (replacing one of the same name). The import wizard shows a failure itself. */
export const useSaveImportTemplateMutation = (options?: UseMutationOptions<void, Error, ImportTemplate>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, ImportTemplate>(
    {
      mutationKey: ["saveImportTemplate"],
      mutationFn: (template) => saveImportTemplate(budget, template),
      invalidates: budgetInvalidation.profileChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
