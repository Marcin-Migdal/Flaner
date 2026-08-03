import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createGroup } from '../../../api/groups';
import type { Group } from '../../../api/groups';
import { useInvalidateUserGroupsQuery } from "../query/useGetUserGroupsQuery";

type CreateGroupInput = Omit<Group, "id" | "createdAt" | "updatedAt" | "nameLower" | "ownerId">;

export const useCreateGroupMutation = (options?: UseMutationOptions<string, Error, CreateGroupInput>) => {
  const { user } = useAuth();
  const invalidateUserGroups = useInvalidateUserGroupsQuery();

  return useMutation<string, Error, CreateGroupInput>({
    mutationFn: async (data) => {
      if (!user) throw new Error("Unauthenticated");
      return await createGroup(data, user.uid);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateUserGroups();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useCreateGroupMutation;
