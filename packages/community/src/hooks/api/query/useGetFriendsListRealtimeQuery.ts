import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFriendsList, subscribeToFriendsList } from '../../../api/users';
import type { Friendship } from '../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";


const getFriendsListRealtimeQueryKeys = (userId: string) => ["friendsListRealtime", userId];

export const useGetFriendsListRealtimeQuery = (
  options?: Omit<UseQueryOptions<Friendship[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getFriendsListRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToFriendsList(user.uid, (friends: Friendship[]) => {
      queryClient.setQueryData(getFriendsListRealtimeQueryKeys(user.uid), friends);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);



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
