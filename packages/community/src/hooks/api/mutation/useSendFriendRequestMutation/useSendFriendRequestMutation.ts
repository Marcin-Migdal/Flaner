
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { sendFriendRequest } from '../../../../api/users';

import { useInvalidateSearchUsersQuery } from "../../query/useSearchUsersQuery";

export type ReceiverInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useSendFriendRequestMutation = (options?: UseMutationOptions<void, Error, ReceiverInput>) => {
  const { user } = useAuth();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, ReceiverInput>({
    mutationKey: ["sendFriendRequest"],
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
      invalidateSearchUsers();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useSendFriendRequestMutation;
