import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { type UserProfile } from "@flaner/shared/types";
import { searchUsers } from '../../../../api/users';
import { reactQueryMeta } from "@flaner/shared/constants";
import { userKeys } from "../../queryKeys";

export const useSearchUsersQuery = (
  searchQuery: string,
  options?: Omit<UseQueryOptions<UserProfile[], Error>, "queryKey" | "queryFn">
) => {
  const { user } = useAuth();

  return useQuery<UserProfile[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: userKeys.search(searchQuery, user?.uid ?? ""),
    queryFn: () => {
      const { uid } = requireUser(user);
      if (!searchQuery.trim()) return [];
      return searchUsers(searchQuery, uid);
    },
    enabled: !!user && !!searchQuery.trim(),
    staleTime: 5000,
    // Keeps the last results on screen while the next query loads, so typing does not flash a spinner
    placeholderData: keepPreviousData,
    ...options,
  });
};

export default useSearchUsersQuery;
