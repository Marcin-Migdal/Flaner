import { useQuery } from "@tanstack/react-query";
import { type UserProfile } from "@flaner/shared/types";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getUsers, subscribeToUsers } from "../../../../api/users";
import { useRealtimeQueryData } from "../../../useRealtimeQueryData";

const getUsersRealtimeQueryKeys = (uids: string[]) => ["usersRealtime", [...uids].sort()];

/** Profiles of `uids`, kept live (a rename / new avatar shows up at once); a missing uid is a deleted account. */
export const useGetUsersRealtimeQuery = (uids: string[]) => {
  const queryKey = getUsersRealtimeQueryKeys(uids);

  useRealtimeQueryData<UserProfile[]>(queryKey, (onUpdate) => subscribeToUsers(uids, onUpdate), uids.length > 0);

  return useQuery<UserProfile[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => getUsers(uids),
    enabled: uids.length > 0,
    staleTime: Infinity, // the listener keeps it fresh
  });
};

export default useGetUsersRealtimeQuery;
