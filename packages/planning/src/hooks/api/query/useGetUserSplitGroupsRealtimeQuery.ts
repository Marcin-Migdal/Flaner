import { reactQueryMeta } from "@flaner/shared/constants";
import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUserSplitGroups, subscribeToUserSplitGroups, type SplitGroup } from "../../../api/splits";

export const getUserSplitGroupsRealtimeQueryKeys = (userId: string) => ["splitGroups", "user", userId];

export const useGetUserSplitGroupsRealtimeQuery = (
  options?: Omit<UseQueryOptions<SplitGroup[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getUserSplitGroupsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserSplitGroups(user.uid, (groups) => {
      queryClient.setQueryData(getUserSplitGroupsRealtimeQueryKeys(user.uid), groups);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);

  return useQuery<SplitGroup[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return getUserSplitGroups(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity,
    ...options,
  });
};

export default useGetUserSplitGroupsRealtimeQuery;
