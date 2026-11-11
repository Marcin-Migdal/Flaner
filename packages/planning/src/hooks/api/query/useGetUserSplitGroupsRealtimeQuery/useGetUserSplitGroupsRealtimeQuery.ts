import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { useAuth } from "@flaner/shared/context";
import { getUserSplitGroups, subscribeToUserSplitGroups, type SplitGroup } from "../../../../api/splits";
import { splitKeys } from "../../queryKeys";

export const useGetUserSplitGroupsRealtimeQuery = (options?: RealtimeQueryOptions<SplitGroup[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: splitKeys.userGroups(uid),
      queryFn: () => getUserSplitGroups(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToUserSplitGroups(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};
