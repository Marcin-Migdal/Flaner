import { useAuth } from "@flaner/shared/context";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getSentFriendRequests, subscribeToSentFriendRequests } from '../../../../api/users';
import type { FriendRequest } from '../../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";


const getSentFriendRequestsRealtimeQueryKeys = (userId: string) => ["sentFriendRequestsRealtime", userId];

export const useGetSentFriendRequestRealtimeQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryKey = getSentFriendRequestsRealtimeQueryKeys(user?.uid ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToSentFriendRequests(user?.uid ?? "", onUpdate, onError),
    !!user?.uid && options?.enabled !== false,
  );



  return useQuery<FriendRequest[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getSentFriendRequests(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity, // Realtime listener handles updates
    ...options,
  });
};

export default useGetSentFriendRequestRealtimeQuery;
