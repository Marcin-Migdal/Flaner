
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { removeFriend } from '../../../api/users';

import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export const useRemoveFriendMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, string>({
    mutationFn: async (friendUid) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await removeFriend(user.uid, friendUid);
    },
    meta: {
      successMessageKey: "community:toasts.removeSuccess",
      errorMessageKey: "community:toasts.removeError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRemoveFriendMutation;
