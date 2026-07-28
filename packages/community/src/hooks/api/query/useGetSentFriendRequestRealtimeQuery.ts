import React, { useEffect } from "react";
import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getSentFriendRequests, subscribeToSentFriendRequests } from "../../../api/endpoints";
import type { FriendRequest } from "../../../api/types";

const getSentFriendRequestsRealtimeQueryKeys = (userId: string) => ["sentFriendRequestsRealtime", userId];

export const useGetSentFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getSentFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToSentFriendRequests(user.uid, (requests: FriendRequest[]) => {
      queryClient.setQueryData(queryKey, requests);
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
