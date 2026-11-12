import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateGroup, type Group } from "../../../../api/groups";
import { groupInvalidation } from "../../queryKeys";

export type UpdateGroupInput = {
  groupId: string;
  data: Partial<Omit<Group, "id" | "createdAt" | "ownerId">>;
};

export const useUpdateGroupMutation = (options?: UseMutationOptions<void, Error, UpdateGroupInput>) =>
  useUserMutation<void, UpdateGroupInput>(
    {
      mutationKey: ["updateGroup"],
      mutationFn: ({ groupId, data }) => updateGroup(groupId, data),
      invalidates: groupInvalidation.updateGroup,
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.updateSuccess",
        errorMessageKey: "community:toasts.manageGroupSheet.updateError",
      },
    },
    options,
  );

export default useUpdateGroupMutation;
