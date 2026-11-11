import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createGroup } from '../../../../api/groups';
import type { Group } from '../../../../api/groups';
import { groupInvalidation } from "../../queryKeys";

type CreateGroupInput = Omit<Group, "id" | "createdAt" | "updatedAt" | "nameLower" | "ownerId">;

export const useCreateGroupMutation = (options?: UseMutationOptions<string, Error, CreateGroupInput>) =>
  useUserMutation<string, CreateGroupInput>(
    {
      mutationKey: ["createGroup"],
      mutationFn: async (data, user) => {
        return await createGroup(data, user.uid);
      },
      invalidates: groupInvalidation.createGroup,
      meta: {
        errorMessageKey: "community:toasts.groupsView.createModal.error",
      },
    },
    options,
  );

export default useCreateGroupMutation;
