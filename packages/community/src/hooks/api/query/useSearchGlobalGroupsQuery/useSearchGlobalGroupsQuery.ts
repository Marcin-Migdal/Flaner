import { type AppInfiniteQueryOptions, type FirestorePageParam } from "@flaner/shared/types";
import { keepPreviousData, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { searchGlobalGroups } from '../../../../api/groups';
import type { Group } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { groupKeys } from "../../queryKeys";

type SearchGroupsResponse = {
  groups: Group[];
  nextCursor?: FirestorePageParam<Group>;
};

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
    meta: reactQueryMeta.fetch,
    queryKey: groupKeys.search(searchQuery),
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

export default useSearchGlobalGroupsQuery;
