import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getFriendsList, subscribeToFriendsList } from '../../../api/users';
import type { Friendship } from '../../../api/users';

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
    queryKey,
    queryFn: () => (user ? getFriendsList(user.uid) : []),
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetFriendsListRealtimeQuery;
