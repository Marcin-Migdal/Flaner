import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getFriendsList, type Friendship } from "../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export const getFriendsListQueryKeys = (userId: string) => ["friendsList", userId];

export const useGetFriendsListQuery = (
  options?: Omit<UseQueryOptions<Friendship[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  return useQuery<Friendship[], Error>({
    queryKey: getFriendsListQueryKeys(user?.uid ?? ""),
    queryFn: () => (user ? getFriendsList(user.uid) : []),
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetFriendsListQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getFriendsListQueryKeys(user?.uid ?? "") });
};

export default useGetFriendsListQuery;
