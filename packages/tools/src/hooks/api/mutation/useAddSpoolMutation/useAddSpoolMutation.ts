import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addSpool, type SpoolInput } from "../../../../api/spools";
import type { FilamentTemplate } from "../../../../api/templates";
import { spoolerInvalidation } from "../../queryKeys";

export type AddSpoolVariables = {
  data: SpoolInput;
  selectedTemplate?: FilamentTemplate;
};

export const useAddSpoolMutation = (options?: UseMutationOptions<string, Error, AddSpoolVariables>) =>
  useUserMutation<string, AddSpoolVariables>(
    {
      mutationKey: ["addSpool"],
      mutationFn: ({ data, selectedTemplate }, { uid }) => addSpool(uid, data, selectedTemplate),
      invalidates: spoolerInvalidation.addSpool,
      meta: {
        successMessageKey: "tools:toasts.spools.addSuccess",
        errorMessageKey: "tools:toasts.spools.addError",
      },
    },
    options,
  );

export default useAddSpoolMutation;
