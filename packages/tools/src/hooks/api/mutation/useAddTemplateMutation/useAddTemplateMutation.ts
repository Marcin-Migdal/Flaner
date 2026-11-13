import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addTemplate, type TemplateInput } from "../../../../api/templates";
import { spoolerInvalidation } from "../../queryKeys";

export const useAddTemplateMutation = (options?: UseMutationOptions<string, Error, TemplateInput>) =>
  useUserMutation<string, TemplateInput>(
    {
      mutationKey: ["addTemplate"],
      mutationFn: (data, { uid }) => addTemplate(uid, data),
      invalidates: spoolerInvalidation.addTemplate,
      meta: {
        successMessageKey: "tools:toasts.templates.addSuccess",
        errorMessageKey: "tools:toasts.templates.addError",
      },
    },
    options,
  );

export default useAddTemplateMutation;
