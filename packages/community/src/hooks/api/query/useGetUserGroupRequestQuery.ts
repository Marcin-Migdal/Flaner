import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getUserGroupRequest } from "../../../api/groups";
import type { GroupRequest } from "../../../api/types";

const getUserGroupRequestQueryKeys = (groupId: string, userId: string) => ["userGroupRequest", groupId, userId];

export const useGetUserGroupRequestQuery = (groupId: string) => {
  const { user } = useAuth();
  
  return useQuery<GroupRequest | null, Error>({
    queryKey: getUserGroupRequestQueryKeys(groupId, user?.uid ?? ""),
    queryFn: async () => {
      if (!user || !groupId) return null;
      return getUserGroupRequest(groupId, user.uid);
    },
    enabled: !!groupId && !!user,
  });
};

export const useInvalidateUserGroupRequestQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return (groupId: string) => queryClient.invalidateQueries({ queryKey: getUserGroupRequestQueryKeys(groupId, user?.uid ?? "") });
};

export default useGetUserGroupRequestQuery;
