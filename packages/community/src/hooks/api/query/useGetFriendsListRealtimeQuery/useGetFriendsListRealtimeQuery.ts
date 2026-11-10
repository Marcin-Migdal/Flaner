import { useAuth } from "@flaner/shared/context";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getFriendsList, subscribeToFriendsList } from '../../../../api/users';
import type { Friendship } from '../../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getFriendsListRealtimeQueryKeys = (userId: string) => ["friendsListRealtime", userId];

export const useGetFriendsListRealtimeQuery = (
  options?: Omit<UseQueryOptions<Friendship[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryKey = getFriendsListRealtimeQueryKeys(user?.uid ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToFriendsList(user?.uid ?? "", onUpdate, onError),
    !!user?.uid && options?.enabled !== false,
  );



  return useQuery<Friendship[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getFriendsList(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetFriendsListRealtimeQuery;
