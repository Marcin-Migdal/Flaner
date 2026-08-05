import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { type UserType } from "@flaner/shared/types";
import { searchUsers } from '../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";


const getSearchUsersQueryKeys = (searchQuery: string, userId: string) => ["searchUsers", searchQuery, userId];

export const useSearchUsersQuery = (
  searchQuery: string,
  options?: Omit<UseQueryOptions<UserType[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();

  return useQuery<UserType[], Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getSearchUsersQueryKeys(searchQuery, user?.uid ?? ""),
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      if (!searchQuery.trim()) return [];
      return searchUsers(searchQuery, user.uid);
    },
    enabled: !!user && !!searchQuery.trim(),
    staleTime: 5000,
    ...options,
  });
};

export const useInvalidateSearchUsersQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["searchUsers"] });
};

export default useSearchUsersQuery;
