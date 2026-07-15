import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth, type UserType } from "@flaner-v2/shared";
import { searchUsers } from "../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export const getSearchUsersQueryKeys = (searchQuery: string, userId: string) => ["searchUsers", searchQuery, userId];

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
