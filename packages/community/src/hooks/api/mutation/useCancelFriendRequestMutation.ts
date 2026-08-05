
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { cancelFriendRequest } from '../../../api/users';

import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export const useCancelFriendRequestMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, string>({
    mutationFn: async (receiverUid) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await cancelFriendRequest(user.uid, receiverUid);
    },
    meta: {
      successMessageKey: "community:toasts.cancelSuccess",
      errorMessageKey: "community:toasts.cancelError",
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

export default useCancelFriendRequestMutation;
