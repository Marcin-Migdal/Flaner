import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getReceivedFriendRequests, subscribeToReceivedFriendRequests } from '../../../api/users';
import type { FriendRequest } from '../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";


const getReceivedFriendRequestsRealtimeQueryKeys = (userId: string) => ["receivedFriendRequestsRealtime", userId];

export const useGetReceivedFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getReceivedFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToReceivedFriendRequests(user.uid, (requests: FriendRequest[]) => {
      queryClient.setQueryData(getReceivedFriendRequestsRealtimeQueryKeys(user.uid), requests);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);



  return useQuery<FriendRequest[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getReceivedFriendRequests(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetReceivedFriendRequestRealtimeQuery;
