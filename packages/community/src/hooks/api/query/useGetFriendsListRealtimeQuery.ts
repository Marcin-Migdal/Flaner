import React, { useEffect } from "react";
import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getFriendsList, subscribeToFriendsList } from "../../../api/endpoints";
import type { Friendship } from "../../../api/types";

const getFriendsListRealtimeQueryKeys = (userId: string) => ["friendsListRealtime", userId];

export const useGetFriendsListRealtimeQuery = (
  options?: Omit<UseQueryOptions<Friendship[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getFriendsListRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToFriendsList(user.uid, (friends: Friendship[]) => {
      queryClient.setQueryData(queryKey, friends);
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
