import { useInfiniteQuery, type UseInfiniteQueryOptions, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { searchGlobalGroups } from "../../../api/groups";

const getSearchGlobalGroupsQueryKeys = (searchQuery: string) => ["searchGlobalGroups", searchQuery];

export const useSearchGlobalGroupsQuery = (
  searchQuery: string,
  pageSize: number = 10,
  options?: Omit<
    UseInfiniteQueryOptions<any, any, any, any, any>,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam" | "placeholderData"
  >,
) => {
  return useInfiniteQuery({
    queryKey: getSearchGlobalGroupsQueryKeys(searchQuery),
    queryFn: ({ pageParam }) => {
      if (!searchQuery.trim()) return { groups: [], nextCursor: undefined };
      return searchGlobalGroups(searchQuery, pageSize, pageParam);
    },
    initialPageParam: undefined as QueryDocumentSnapshot<DocumentData, DocumentData> | undefined,
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
