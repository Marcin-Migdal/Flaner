import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteTemplate } from "../../../../api/templates";
import { spoolerInvalidation } from "../../queryKeys";

export type DeleteTemplateVariables = {
  templateId: string;
  deleteSpools?: boolean;
};

export const useDeleteTemplateMutation = (options?: UseMutationOptions<void, Error, DeleteTemplateVariables>) =>
  useUserMutation<void, DeleteTemplateVariables>(
    {
      mutationKey: ["deleteTemplate"],
      mutationFn: ({ templateId, deleteSpools }, { uid }) => deleteTemplate(templateId, deleteSpools, uid),
      invalidates: spoolerInvalidation.deleteTemplate,
      meta: {
        successMessageKey: "tools:toasts.templates.deleteSuccess",
        errorMessageKey: "tools:toasts.templates.deleteError",
      },
    },
    options,
  );

export default useDeleteTemplateMutation;
