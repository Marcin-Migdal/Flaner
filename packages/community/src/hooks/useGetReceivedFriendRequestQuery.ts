import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getReceivedFriendRequests, type FriendRequest } from "../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export const getReceivedFriendRequestsQueryKeys = (userId: string) => ["receivedFriendRequests", userId];

export const useGetReceivedFriendRequestQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  return useQuery<FriendRequest[], Error>({
    queryKey: getReceivedFriendRequestsQueryKeys(user?.uid ?? ""),
    queryFn: () => (user ? getReceivedFriendRequests(user.uid) : []),
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetReceivedFriendRequestQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getReceivedFriendRequestsQueryKeys(user?.uid ?? "") });
};

export default useGetReceivedFriendRequestQuery;
