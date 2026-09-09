import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { editTemplate, type TemplateInput } from "../../../api/templates";
import { useInvalidateGetTemplatesQuery } from "../query/useGetTemplatesQuery";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export type EditTemplateVariables = {
  templateId: string;
  newData: TemplateInput;
  propagate?: boolean;
};

export const useEditTemplateMutation = (
  options?: UseMutationOptions<void, Error, EditTemplateVariables>,
) => {
  const { user } = useAuth();
  const invalidateTemplates = useInvalidateGetTemplatesQuery();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<void, Error, EditTemplateVariables>({
    mutationFn: async ({ templateId, newData, propagate }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await editTemplate(templateId, newData, propagate, user.uid);
    },
    meta: {
      successMessageKey: "tools:toasts.templates.editSuccess",
      errorMessageKey: "tools:toasts.templates.editError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateTemplates();
      invalidateSpools();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useEditTemplateMutation;
