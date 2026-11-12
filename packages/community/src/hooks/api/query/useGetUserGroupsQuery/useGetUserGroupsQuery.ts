import { useAuth } from "@flaner/shared/context";
import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getUserGroups, subscribeToUserGroups, type Group } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetUserGroupsQuery = (options?: RealtimeQueryOptions<Group[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: groupKeys.userGroups(uid),
      queryFn: () => getUserGroups(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToUserGroups(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};

export default useGetUserGroupsQuery;
