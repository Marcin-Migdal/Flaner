import { useRealtimeQuery } from "@flaner/shared/hooks";
import type { UserProfile } from "@flaner/shared/types";
import { getUsers, subscribeToUsers } from "../../../../api/users";
import { userKeys } from "../../queryKeys";

/** Profiles of `uids`, kept live (a rename / new avatar shows up at once); a missing uid is a deleted account. */
export const useGetUsersRealtimeQuery = (uids: string[]) =>
  useRealtimeQuery<UserProfile[]>({
    queryKey: userKeys.profilesRealtime(uids),
    queryFn: () => getUsers(uids),
    subscribe: (onUpdate, onError) => subscribeToUsers(uids, onUpdate, onError),
    enabled: uids.length > 0,
  });

export default useGetUsersRealtimeQuery;
