import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getUserGroups, subscribeToUserGroups } from '../../../../api/groups';
import type { Group } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "../../../useRealtimeQueryData";

const getUserGroupsQueryKeys = (userId: string) => ["userGroups", userId];

export const useGetUserGroupsQuery = (options?: Omit<UseQueryOptions<Group[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();
  const queryKey = getUserGroupsQueryKeys(user?.uid ?? "");

  useRealtimeQueryData<Group[]>(
    queryKey,
    (onUpdate) => subscribeToUserGroups(user?.uid ?? "", onUpdate),
    !!user && options?.enabled !== false,
  );

  return useQuery<Group[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getUserGroups(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity, // the listener keeps it fresh
    ...options,
  });
};

export const useInvalidateUserGroupsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getUserGroupsQueryKeys(user?.uid ?? "") });
};

export default useGetUserGroupsQuery;
