import { useQuery, type UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { type UserType } from "@flaner/shared/types";
import { searchUsers } from '../../../api/users';

const getSearchUsersQueryKeys = (searchQuery: string, userId: string) => ["searchUsers", searchQuery, userId];

export const useSearchUsersQuery = (
  searchQuery: string,
  options?: Omit<UseQueryOptions<UserType[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();
  return useQuery<UserType[], Error>({
    queryKey: getSearchUsersQueryKeys(searchQuery, user?.uid ?? ""),
    queryFn: () => (user && searchQuery.trim() ? searchUsers(searchQuery, user.uid) : []),
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
