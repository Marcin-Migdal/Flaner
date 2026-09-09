import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { deleteTemplate } from "../../../api/templates";
import { useInvalidateGetTemplatesQuery } from "../query/useGetTemplatesQuery";
import { useInvalidateGetSpoolsQuery } from "../query/useGetSpoolsQuery";

export type DeleteTemplateVariables = {
  templateId: string;
  deleteSpools?: boolean;
};

export const useDeleteTemplateMutation = (
  options?: UseMutationOptions<void, Error, DeleteTemplateVariables>,
) => {
  const { user } = useAuth();
  const invalidateTemplates = useInvalidateGetTemplatesQuery();
  const invalidateSpools = useInvalidateGetSpoolsQuery();

  return useMutation<void, Error, DeleteTemplateVariables>({
    mutationFn: async ({ templateId, deleteSpools }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await deleteTemplate(templateId, deleteSpools, user.uid);
    },
    meta: {
      successMessageKey: "tools:toasts.templates.deleteSuccess",
      errorMessageKey: "tools:toasts.templates.deleteError",
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

export default useDeleteTemplateMutation;
