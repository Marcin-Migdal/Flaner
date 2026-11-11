import { reactQueryMeta } from "@flaner/shared/constants";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getEventParticipantsProfiles, type ParticipantResult } from "../../../../api/participants";
import { participantKeys } from "../../queryKeys";

export const useGetEventParticipantsProfilesQuery = <TData = ParticipantResult[]>(
  userIds: string[],
  options?: Omit<UseQueryOptions<ParticipantResult[], Error, TData>, "queryKey" | "queryFn">,
) => {
  return useQuery<ParticipantResult[], Error, TData>({
    meta: reactQueryMeta.fetch,
    queryKey: participantKeys.profiles(userIds),
    queryFn: () => getEventParticipantsProfiles(userIds),
    enabled: userIds && userIds.length > 0,
    ...options,
  });
};
