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
      // Błędy nie są łapane (try/catch), lecz przelatują wyżej do React Query, aby wywołać onError meta toast
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
