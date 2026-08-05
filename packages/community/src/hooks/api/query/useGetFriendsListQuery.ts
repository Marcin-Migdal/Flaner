import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getFriendsList } from '../../../api/users';
import type { Friendship } from '../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";


const getFriendsListQueryKeys = (userId: string) => ["friendsList", userId];

export const useGetFriendsListQuery = (
  options?: Omit<UseQueryOptions<Friendship[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<Friendship[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getFriendsListQueryKeys(user?.uid ?? ""),
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getFriendsList(user.uid);
    },
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
