import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers } from '../../../api/users';
import { type UserType } from "@flaner/shared/types";

const getUsersQueryKeys = (uids: string[]) => ["users", uids];

export const useGetUsersQuery = (uids: string[]) => {
  return useQuery<UserType[], Error>({
    queryKey: getUsersQueryKeys(uids),
    queryFn: async () => {
      if (!uids || uids.length === 0) return [];
      return getUsers(uids);
    },
    enabled: !!uids && uids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export const useInvalidateUsersQuery = () => {
  const queryClient = useQueryClient();
  return (uids: string[]) => queryClient.invalidateQueries({ queryKey: getUsersQueryKeys(uids) });
};

export default useGetUsersQuery;
