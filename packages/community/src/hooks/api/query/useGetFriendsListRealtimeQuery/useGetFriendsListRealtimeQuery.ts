import { useAuth } from "@flaner/shared/context";
import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { getFriendsList, subscribeToFriendsList, type Friendship } from "../../../../api/users";
import { userKeys } from "../../queryKeys";

export const useGetFriendsListRealtimeQuery = (options?: RealtimeQueryOptions<Friendship[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: userKeys.friends(uid),
      queryFn: () => getFriendsList(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToFriendsList(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};

export default useGetFriendsListRealtimeQuery;
