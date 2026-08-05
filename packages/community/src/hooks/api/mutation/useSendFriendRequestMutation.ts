
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { sendFriendRequest } from '../../../api/users';

import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export type ReceiverInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useSendFriendRequestMutation = (options?: UseMutationOptions<void, Error, ReceiverInput>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, ReceiverInput>({
    mutationFn: async (receiver) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await sendFriendRequest({ uid: user.uid, username: user.username, avatarUrl: user.avatarUrl }, receiver);
    },
    meta: {
      successMessageKey: "community:toasts.sendSuccess",
      errorMessageKey: "community:toasts.sendError",
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

export default useSendFriendRequestMutation;
