
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { rejectFriendRequest } from '../../../api/users';

import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

type SenderInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useRejectFriendRequestMutation = (options?: UseMutationOptions<void, Error, SenderInput>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, SenderInput>({
    mutationFn: async (sender) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await rejectFriendRequest(sender, { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl });
    },
    meta: {
      successMessageKey: "community:toasts.rejectSuccess",
      errorMessageKey: "community:toasts.rejectError",
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

export default useRejectFriendRequestMutation;
