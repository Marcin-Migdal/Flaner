import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getEventParticipantsProfiles } from "../../../api/participants/endpoints";
import type { ParticipantResult } from "../../../api/participants/types";

export const getEventParticipantsProfilesQueryKeys = (userIds: string[]) => ["participants", "profiles", userIds.sort().join(",")];

export const useEventParticipantsProfilesQuery = <TData = ParticipantResult[]>(
  userIds: string[],
  options?: Omit<UseQueryOptions<ParticipantResult[], Error, TData>, "queryKey" | "queryFn">,
) => {
  return useQuery<ParticipantResult[], Error, TData>({
    meta: reactQueryMeta.fetch,
    queryKey: getEventParticipantsProfilesQueryKeys(userIds),
    queryFn: () => getEventParticipantsProfiles(userIds),
    enabled: userIds && userIds.length > 0,
    ...options,
  });
};

export const useInvalidateEventParticipantsProfilesQuery = () => {
  const queryClient = useQueryClient();
  return (userIds: string[]) => queryClient.invalidateQueries({ queryKey: getEventParticipantsProfilesQueryKeys(userIds) });
};
