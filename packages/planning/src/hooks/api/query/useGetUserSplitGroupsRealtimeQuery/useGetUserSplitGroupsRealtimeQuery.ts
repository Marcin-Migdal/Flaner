import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";
import { useAuth } from "@flaner/shared/context";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getUserSplitGroups, subscribeToUserSplitGroups, type SplitGroup } from "../../../../api/splits";

export const getUserSplitGroupsRealtimeQueryKeys = (userId: string) => ["splitGroups", "user", userId];

export const useGetUserSplitGroupsRealtimeQuery = (
  options?: Omit<UseQueryOptions<SplitGroup[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryKey = getUserSplitGroupsRealtimeQueryKeys(user?.uid ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToUserSplitGroups(user?.uid ?? "", onUpdate, onError),
    !!user?.uid,
  );

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
