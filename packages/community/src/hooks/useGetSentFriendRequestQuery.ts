import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getSentFriendRequests, type FriendRequest } from "../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export const getSentFriendRequestsQueryKeys = (userId: string) => ["sentFriendRequests", userId];

export const useGetSentFriendRequestQuery = (
  options?: Omit<UseQueryOptions<FriendRequest[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  return useQuery<FriendRequest[], Error>({
    queryKey: getSentFriendRequestsQueryKeys(user?.uid ?? ""),
    queryFn: () => (user ? getSentFriendRequests(user.uid) : []),
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetSentFriendRequestQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getSentFriendRequestsQueryKeys(user?.uid ?? "") });
};

export default useGetSentFriendRequestQuery;
