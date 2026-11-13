import { USER_NOT_AUTHENTICATED, useRealtimeQuery } from "@flaner/shared/hooks";
import { getUserGroupInvitations, subscribeToUserGroupInvitations, type GroupInvitation } from "../../../../api/groups";
import { groupKeys } from "../../queryKeys";

export const useGetUserGroupInvitationsQuery = (userId: string | undefined) =>
  useRealtimeQuery<GroupInvitation[]>({
    queryKey: groupKeys.userInvitations(userId ?? ""),
    queryFn: () => {
      if (!userId) throw new Error(USER_NOT_AUTHENTICATED);
      return getUserGroupInvitations(userId);
    },
    subscribe: (onUpdate, onError) => subscribeToUserGroupInvitations(userId ?? "", onUpdate, onError),
    enabled: !!userId,
  });

export default useGetUserGroupInvitationsQuery;
