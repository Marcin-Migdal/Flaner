import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { editTemplate, type TemplateInput } from "../../../../api/templates";
import { spoolerInvalidation } from "../../queryKeys";

export type EditTemplateVariables = {
  templateId: string;
  newData: TemplateInput;
  propagate?: boolean;
};

export const useEditTemplateMutation = (options?: UseMutationOptions<void, Error, EditTemplateVariables>) =>
  useUserMutation<void, EditTemplateVariables>(
    {
      mutationKey: ["editTemplate"],
      mutationFn: ({ templateId, newData, propagate }, { uid }) => editTemplate(templateId, newData, propagate, uid),
      invalidates: spoolerInvalidation.editTemplate,
      meta: {
        successMessageKey: "tools:toasts.templates.editSuccess",
        errorMessageKey: "tools:toasts.templates.editError",
      },
    },
    options,
  );

export default useEditTemplateMutation;
