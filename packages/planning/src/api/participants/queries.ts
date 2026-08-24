import { useQuery } from "@tanstack/react-query";
import { searchParticipants } from "./endpoints";

export const useSearchParticipantsQuery = (searchQuery: string) => {
  return useQuery({
    queryKey: ["searchParticipants", searchQuery],
    queryFn: () => searchParticipants(searchQuery),
    enabled: searchQuery.length > 0,
  });
};
