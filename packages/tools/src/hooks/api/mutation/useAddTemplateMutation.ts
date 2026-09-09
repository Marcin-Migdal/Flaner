import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { addTemplate, type TemplateInput } from "../../../api/templates";
import { useInvalidateGetTemplatesQuery } from "../query/useGetTemplatesQuery";

export const useAddTemplateMutation = (
  options?: UseMutationOptions<string, Error, TemplateInput>,
) => {
  const { user } = useAuth();
  const invalidateTemplates = useInvalidateGetTemplatesQuery();

  return useMutation<string, Error, TemplateInput>({
    mutationFn: async (data: TemplateInput) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return await addTemplate(user.uid, data);
    },
    meta: {
      successMessageKey: "tools:toasts.templates.addSuccess",
      errorMessageKey: "tools:toasts.templates.addError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateTemplates();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAddTemplateMutation;
