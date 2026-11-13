import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { searchParticipants, type ParticipantResult } from "../../../../api/participants";
import { participantKeys } from "../../queryKeys";

export const useSearchParticipantsQuery = (
  searchQuery: string,
  currentUserId?: string,
  options?: Omit<UseQueryOptions<ParticipantResult[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ParticipantResult[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: participantKeys.search(searchQuery, currentUserId),
    queryFn: () => searchParticipants(searchQuery, currentUserId),
    enabled: searchQuery.length > 0,
    // Keeps the last results on screen while the next query loads, so typing does not flash a spinner
    placeholderData: keepPreviousData,
    ...options,
  });
};
