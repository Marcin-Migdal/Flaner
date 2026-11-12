import { useAuth } from "@flaner/shared/context";
import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getSentFriendRequests, subscribeToSentFriendRequests, type FriendRequest } from "../../../../api/users";
import { userKeys } from "../../queryKeys";

export const useGetSentFriendRequestRealtimeQuery = (options?: RealtimeQueryOptions<FriendRequest[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: userKeys.sentRequests(uid),
      queryFn: () => getSentFriendRequests(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToSentFriendRequests(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};

export default useGetSentFriendRequestRealtimeQuery;
