import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { editSpool, type SpoolInput } from "../../../api/spools";
import type { FilamentTemplate } from "../../../api/templates";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export type EditSpoolVariables = {
  spoolId: string;
  data: SpoolInput;
  selectedTemplate?: FilamentTemplate;
};

export const useEditSpoolMutation = (
  options?: UseMutationOptions<void, Error, EditSpoolVariables>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<void, Error, EditSpoolVariables>({
    mutationFn: async ({ spoolId, data, selectedTemplate }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await editSpool(spoolId, data, selectedTemplate);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.editSuccess",
      errorMessageKey: "tools:toasts.spools.editError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateSpools();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useEditSpoolMutation;
