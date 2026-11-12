import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { editSpool, type SpoolInput } from "../../../../api/spools";
import type { FilamentTemplate } from "../../../../api/templates";
import { spoolerInvalidation } from "../../queryKeys";

export type EditSpoolVariables = {
  spoolId: string;
  data: SpoolInput;
  selectedTemplate?: FilamentTemplate;
};

export const useEditSpoolMutation = (options?: UseMutationOptions<void, Error, EditSpoolVariables>) =>
  useUserMutation<void, EditSpoolVariables>(
    {
      mutationKey: ["editSpool"],
      mutationFn: ({ spoolId, data, selectedTemplate }) => editSpool(spoolId, data, selectedTemplate),
      invalidates: spoolerInvalidation.editSpool,
      meta: {
        successMessageKey: "tools:toasts.spools.editSuccess",
        errorMessageKey: "tools:toasts.spools.editError",
      },
    },
    options,
  );

export default useEditSpoolMutation;
