import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroupRequest } from '../../../api/groups';
import type { GroupRequest } from '../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";


const getUserGroupRequestQueryKeys = (groupId: string, userId: string) => ["userGroupRequest", groupId, userId];

export const useGetUserGroupRequestQuery = (groupId: string) => {
  const { user } = useAuth();



  return useQuery<GroupRequest | null, Error>({
      meta: reactQueryMeta.fetch,
    queryKey: getUserGroupRequestQueryKeys(groupId, user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      if (!groupId) throw new Error("errors.fetchError");
      return getUserGroupRequest(groupId, user.uid);
    },
    enabled: !!groupId && !!user,
  });
};

export const useInvalidateUserGroupRequestQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return (groupId: string) =>
    queryClient.invalidateQueries({ queryKey: getUserGroupRequestQueryKeys(groupId, user?.uid ?? "") });
};

export default useGetUserGroupRequestQuery;
