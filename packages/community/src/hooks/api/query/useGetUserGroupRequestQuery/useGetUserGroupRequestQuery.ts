import { useAuth } from "@flaner/shared/context";
import { requireUser, useRealtimeQuery } from "@flaner/shared/hooks";
import { getUserGroupRequest, subscribeToUserGroupRequest, type GroupRequest } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetUserGroupRequestQuery = (groupId: string) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery<GroupRequest | null>({
    queryKey: groupKeys.userRequest(groupId, uid),
    queryFn: async () => {
      const { uid: userId } = requireUser(user);
      if (!groupId) throw new Error("errors.fetchError");
      return getUserGroupRequest(groupId, userId);
    },
    subscribe: (onUpdate, onError) => subscribeToUserGroupRequest(groupId, uid, onUpdate, onError),
    enabled: !!groupId && !!user,
  });
};

export default useGetUserGroupRequestQuery;
