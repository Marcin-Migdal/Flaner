import { useAuth } from "@flaner/shared/context";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getReceivedFriendRequests, subscribeToReceivedFriendRequests } from '../../../../api/users';
import type { FriendRequest } from '../../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getReceivedFriendRequestsRealtimeQueryKeys = (userId: string) => ["receivedFriendRequestsRealtime", userId];

export const useGetReceivedFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryKey = getReceivedFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToReceivedFriendRequests(user?.uid ?? "", onUpdate, onError),
    !!user?.uid && options?.enabled !== false,
  );



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
