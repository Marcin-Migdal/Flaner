import { type AppInfiniteQueryOptions, type FirestorePageParam } from "@flaner/shared/types";
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { searchGlobalGroups } from '../../../api/groups';
import type { Group } from '../../../api/groups';

type SearchGroupsResponse = {
  groups: Group[];
  nextCursor?: FirestorePageParam<Group>;
};

const getSearchGlobalGroupsQueryKeys = (searchQuery: string) => ["searchGlobalGroups", searchQuery];

export const useSearchGlobalGroupsQuery = (
  searchQuery: string,
  pageSize: number = 10,
  options?: AppInfiniteQueryOptions<SearchGroupsResponse, string[], "placeholderData", FirestorePageParam<Group>>,
) => {
  return useInfiniteQuery<
    SearchGroupsResponse,
    Error,
    InfiniteData<SearchGroupsResponse, FirestorePageParam<Group>>,
    string[],
    FirestorePageParam<Group>
  >({
    queryKey: getSearchGlobalGroupsQueryKeys(searchQuery),
    queryFn: ({ pageParam }) => {
      if (!searchQuery.trim()) return { groups: [], nextCursor: undefined };
      return searchGlobalGroups(searchQuery, pageSize, pageParam);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!searchQuery.trim(),
    staleTime: 5000,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useInvalidateSearchGlobalGroupsQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["searchGlobalGroups"] });
};

export default useSearchGlobalGroupsQuery;
