import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSentFriendRequests, subscribeToSentFriendRequests } from '../../../api/users';
import type { FriendRequest } from '../../../api/users';

const getSentFriendRequestsRealtimeQueryKeys = (userId: string) => ["sentFriendRequestsRealtime", userId];

export const useGetSentFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getSentFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToSentFriendRequests(user.uid, (requests: FriendRequest[]) => {
      queryClient.setQueryData(getSentFriendRequestsRealtimeQueryKeys(user.uid), requests);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);

  return useQuery<FriendRequest[], Error>({
    queryKey,
    queryFn: () => (user ? getSentFriendRequests(user.uid) : []),
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetSentFriendRequestRealtimeQuery;
