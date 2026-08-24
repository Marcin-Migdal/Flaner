import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { searchParticipants, type ParticipantResult } from "../../../api/participants";

export const getSearchParticipantsQueryKeys = (searchQuery: string, currentUserId?: string) => ["participants", "search", searchQuery, currentUserId];

export const useSearchParticipantsQuery = (
  searchQuery: string,
  currentUserId?: string,
  options?: Omit<UseQueryOptions<ParticipantResult[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ParticipantResult[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getSearchParticipantsQueryKeys(searchQuery, currentUserId),
    queryFn: () => {
      // Errors are not caught here; they bubble up to React Query to trigger onError meta toasts
      return searchParticipants(searchQuery, currentUserId);
    },
    enabled: searchQuery.length > 0,
    ...options,
  });
};

export const useInvalidateSearchParticipantsQuery = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["participants", "search"] });
};
