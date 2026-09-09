import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { addSpool, type SpoolInput } from "../../../api/spools";
import type { FilamentTemplate } from "../../../api/templates";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export type AddSpoolVariables = {
  data: SpoolInput;
  selectedTemplate?: FilamentTemplate;
};

export const useAddSpoolMutation = (
  options?: UseMutationOptions<string, Error, AddSpoolVariables>,
) => {
  const { user } = useAuth();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<string, Error, AddSpoolVariables>({
    mutationFn: async ({ data, selectedTemplate }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await addSpool(user.uid, data, selectedTemplate);
    },
    meta: {
      successMessageKey: "tools:toasts.spools.addSuccess",
      errorMessageKey: "tools:toasts.spools.addError",
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

export default useAddSpoolMutation;
