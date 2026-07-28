import React, { useEffect } from "react";
import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getReceivedFriendRequests, subscribeToReceivedFriendRequests } from "../../../api/endpoints";
import type { FriendRequest } from "../../../api/types";

const getReceivedFriendRequestsRealtimeQueryKeys = (userId: string) => ["receivedFriendRequestsRealtime", userId];

export const useGetReceivedFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getReceivedFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToReceivedFriendRequests(user.uid, (requests: FriendRequest[]) => {
      queryClient.setQueryData(queryKey, requests);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);

  return useQuery<FriendRequest[], Error>({
    queryKey,
    queryFn: () => (user ? getReceivedFriendRequests(user.uid) : []),
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetReceivedFriendRequestRealtimeQuery;
