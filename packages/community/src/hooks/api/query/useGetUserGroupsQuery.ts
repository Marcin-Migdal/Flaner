import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getUserGroups } from '../../../api/groups';
import type { Group } from '../../../api/groups';

const getUserGroupsQueryKeys = (userId: string) => ["userGroups", userId];

export const useGetUserGroupsQuery = (options?: Omit<UseQueryOptions<Group[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();
  return useQuery<Group[], Error>({
    queryKey: getUserGroupsQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) return [];
      try {
        return await getUserGroups(user.uid);
      } catch (err) {
        console.error("Firebase getUserGroups Error:", err);
        throw err;
      }
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateUserGroupsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getUserGroupsQueryKeys(user?.uid ?? "") });
};

export default useGetUserGroupsQuery;
