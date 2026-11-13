import { useQuery } from "@tanstack/react-query";
import { getUserProfiles } from "@flaner/shared/api";
import { type UserProfile } from "@flaner/shared/types";
import { reactQueryMeta } from "@flaner/shared/constants";
import { userKeys } from "../../queryKeys";

export const useGetUsersQuery = (uids: string[]) => {
  return useQuery<UserProfile[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: userKeys.profiles(uids),
    queryFn: async () => {
      if (!uids || uids.length === 0) return [];
      return getUserProfiles(uids);
    },
    enabled: !!uids && uids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export default useGetUsersQuery;
