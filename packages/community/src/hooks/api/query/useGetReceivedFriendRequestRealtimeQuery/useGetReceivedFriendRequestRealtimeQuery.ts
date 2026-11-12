import { useAuth } from "@flaner/shared/context";
import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getReceivedFriendRequests, subscribeToReceivedFriendRequests, type FriendRequest } from "../../../../api/users";
import { userKeys } from "../../queryKeys";

export const useGetReceivedFriendRequestRealtimeQuery = (options?: RealtimeQueryOptions<FriendRequest[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: userKeys.receivedRequests(uid),
      queryFn: () => getReceivedFriendRequests(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToReceivedFriendRequests(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};

export default useGetReceivedFriendRequestRealtimeQuery;
